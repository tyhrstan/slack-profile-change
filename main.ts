import "jsr:@std/dotenv/load";
import { SlackResponse } from "./types.ts";

const fetchProfilePicture = async () : Promise<SlackResponse | null> => {
  const response = await fetch("https://slack.com/api/users.profile.get", {
    headers: {
      Authorization: `Bearer ${Deno.env.get("SLACK_TOKEN")}`
    }
  });
  if (!response.ok) {
    console.error("Failed to fetch profile picture:", response.statusText);
    return null;
  }
  const data = await response.json();
  return data;
}

const setProfilePicture = async (imageFile: Blob) : Promise<SlackResponse | null> => {
  const formData = new FormData();
  formData.append("image", imageFile, "avatar.png");

  const response = await fetch("https://slack.com/api/users.setPhoto", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SLACK_TOKEN")}`
    },
    body: formData
  });
  if (!response.ok) {
    console.error("Failed to set profile picture:", response.statusText);
    return null;
  }
  const data = await response.json();
  return data;
};

const kv = await Deno.openKv();

const emojiImageMap = new Map<string, string>([
  [":bread:", "./eten.png"],
  [":pompom:", "./eureka.png"],
  [":dash:", "./rennen.png"],
  [":thinking_face:", "./verbaasd.png"],
  ["", "./normaal.png"],
]);

Deno.cron("match profile id", "*/2 6-16 * * 2-6", () => {

  fetchProfilePicture()
    .then(async data => {
      if (data) {
        
        //check if the profile emonji is in the map and if the avatar_hash is not the same as stored in kv set the profile picture
        const emoji = data.profile.status_emoji || "";
        const avatarHash = data.profile.avatar_hash;
        const storedAvatar = await kv.get([`avatar_hash_${emoji}`]);
        if (emojiImageMap.has(emoji) && storedAvatar.value !== avatarHash) {
          const imageFilePath = emojiImageMap.get(emoji);
          const imageFile = await Deno.readFile(imageFilePath as string);
          if (imageFile) {
            setProfilePicture(new Blob([imageFile], { type: "image/png" }))
              .then(response => {
                if (response && response.ok) {
                  const newAvatarHash = response.profile.avatar_hash;
                  console.log("✅ Profile picture updated successfully:", newAvatarHash);
                  kv.set([`avatar_hash_${emoji}`], newAvatarHash);
                } else {
                  console.error("❌ Failed to update profile picture.");
                }
              })
              .catch(error => {
                console.error("💀 Error updating profile picture:", error);
              });
          }
        } else {
          console.log("😙 No matching emoji found or avatar hash is the same.");
        }
      } else {
        console.error("❌ Failed to fetch profile picture.");
      }
    })
    .catch(error => {
      console.error("💀 Error fetching profile picture:", error);
    });

});
console.debug("🕝 Registered cron job");