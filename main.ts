import "jsr:@std/dotenv/load";
import { SlackResponse } from "./types.ts";

const fetchProfilePicture = async (): Promise<SlackResponse | null> => {
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

const setProfilePicture = async (imageFile: Blob): Promise<SlackResponse | null> => {
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

const stateToWordsAndImageMap = new Map<string, { image: string, words: string[] }>([
  //["eating", { image: "./images/eten.png", words: ["lunch", "eten", "brood"] }],
  ["amazed", { image: "./images/amazed.png", words: ["verbaasd", "verbazig"] }],
  ["angry", { image: "./images/angry.png", words: ["rage", "boos", "angry"] }],
  ["busy", { image: "./images/busy.png", words: ["bezig", "druk", "niet storen", "afwezig", "meeting"] }],
  ["cry", { image: "./images/cry.png", words: [":'(", "cry"] }],
  ["questioning", { image: "./images/questioning.png", words: ["whut", "??"] }],
  ["relaxing", { image: "./images/relaxing.png", words: ["chill", "weekend"] }],
  ["run", { image: "./images/run.png", words: ["zo terug", "boodschappen", "brb"] }],
  ["sad", { image: "./images/sad.png", words: [":(", "sad", "ai"] }],
  ["scared", { image: "./images/questioning.png", words: ["aiai", "!!", "ohnoos"] }],
  ["sleep", { image: "./images/sleep.png", words: ["slapen", "tukkie doen", "sleep"] }],
  ["sweat", { image: "./images/sweat.png", words: ["zweten", "peentjes"] }],
  // Add more states and their corresponding images and words here
  ["default", { image: "./images/default.png", words: [] }],
]);

Deno.cron("track during workhours", "*/2 6-16 * * 2-6", () => {

  fetchProfilePicture()
    .then(async data => {
      if (data) {

        //check if the profile emonji is in the map and if the avatar_hash is not the same as stored in kv set the profile picture
        const status_text = data.profile.status_text || "";
        const avatarHash = data.profile.avatar_hash;
        const findStateKeyByStatusText = (status_text: string) => {
          for (const [key, value] of stateToWordsAndImageMap.entries()) {
            if (value.words.some(word => status_text.toLowerCase().includes(word))) {
              return key;
            }
          }
          return null;
        };
        console.log("💭 Status text:", status_text);
        const matchedState = findStateKeyByStatusText(status_text) ?? "default";
        const storedAvatar = await kv.get([`avatar_hash_${matchedState}`]);
        if (stateToWordsAndImageMap.has(matchedState) && storedAvatar.value !== avatarHash) {
          console.log("✨ Changing state to:", matchedState);
          const imageFilePath = stateToWordsAndImageMap.get(matchedState)?.image;
          const imageFile = await Deno.readFile(imageFilePath as string);
          if (imageFile) {
            setProfilePicture(new Blob([imageFile], { type: "image/png" }))
              .then(response => {
                if (response && response.ok) {
                  const newAvatarHash = response.profile.avatar_hash;
                  console.log("✅ Profile picture updated successfully:", newAvatarHash);
                  kv.set([`avatar_hash_${matchedState}`], newAvatarHash);
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