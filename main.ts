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
  ["default", { image: "./images/happy.png", words: [] }],

  ["agitated", { image: "./images/agitated.png", words: ["agitated", "mad", "frustrated", "geërgerd", "gefrustreerd", "!!!", "💀", ":skull:"] }],
  ["alarmed", { image: "./images/alarmed.png", words: ["alarmed", "alert", "startled", "gealarmeerd", "geschrokken","!!", "🚨", ":alarm:"] }],
  ["angry", { image: "./images/angry.png", words: ["angry", "furious", "irritated", "boos", "kwaad", "geïrriteerd", "😠", ":angry:"] }],
  ["bored", { image: "./images/bored.png", words: ["bored", "uninterested", "apathetic", "verveeld", "ongeïnteresseerd", "apathisch", "😐", ":neutral_face:"] }],
  ["confused", { image: "./images/confused.png", words: ["confused", "puzzled", "uncertain", "verward", "in de war", "onzeker", "🤔", ":thinking_face:"] }],
  ["content", { image: "./images/content.png", words: ["content", "satisfied", "pleased", "tevreden", "voldaan", "blij", "😊", ":smile:"] }],
  ["cry-hard", { image: "./images/cry-hard.png", words: ["crying", "sobbing", "weeping", "hard huilen", "snikken", "wenen", "😭", ":sob:"] }],
  ["eating", { image: "./images/eating.png", words: ["eating", "snacking", "dining", "eten", "lunch", "food", "snacken", "dineren", "🍴", ":fork_and_knife:"] }],
  ["embarrassed", { image: "./images/embarrassed.png", words: ["embarrassed", "ashamed", "awkward", "beschaamd", "verlegen", "ongemakkelijk", "😳", ":blush:"] }],
  ["excited", { image: "./images/excited.png", words: ["excited", "thrilled", "enthusiastic", "opgewonden", "enthousiast", "verheugd", "😃", ":smiley:"] }],
  ["gratefull", { image: "./images/gratefull.png", words: ["grateful", "thankful", "appreciative", "dankbaar", "erkentelijk", "waarderend", "🙏", ":pray:"] }],
  ["happy", { image: "./images/happy.png", words: ["happy", "joyful", "cheerful", "blij", "gelukkig", "vrolijk", "😄", ":smirk:"] }],
  ["in-love", { image: "./images/in-love.png", words: ["in love", "infatuated", "smitten", "verliefd", "betoverd", "smachtend", "❤️", ":heart:"] }],
  ["laughing", { image: "./images/laughing.png", words: ["laughing", "giggling", "chuckling", "lachen", "grinniken", "giechelen", "😂", ":joy:"] }],
  ["mad", { image: "./images/mad.png", words: ["mad", "ziedend", "😡", ":go_beserk:"] }],
  ["making-a-point", { image: "./images/making-a-point.png", words: ["making a point", "emphasizing", "highlighting", "een punt maken", "benadrukken", "onderstrepen", "☝️", ":point_up:"] }],
  ["nervous", { image: "./images/nervous.png", words: ["nervous", "anxious", "tense", "nerveus", "angstig", "gespannen", "😬", ":grimaching:"] }],
  ["sad", { image: "./images/sad.png", words: ["sad", "unhappy", "down", "verdrietig", "ongelukkig", "somber", "😢", ":cry:"] }],
  ["shocked", { image: "./images/shocked.png", words: ["shocked", "stunned", "dumbfounded", "geschokt", "verbijsterd", "onthutst", "😱", ":scream:"] }],
  ["sleeping", { image: "./images/sleeping.png", words: ["sleeping", "resting", "napping", "slapen", "rusten", "dutten", "😴", "⛔", ":no_entry_sign:"] }],
  ["sleepy", { image: "./images/sleepy.png", words: ["sleepy", "drowsy", "tired", "slaperig", "moe", "dof", "😪", ":sleepy:"] }],
  ["smirking", { image: "./images/smirking.png", words: ["smirking", "grinning", "sneering", "grijnzen", "glimlachen", "spottend", "😏", ":smirk:"] }],
  ["stressed", { image: "./images/stressed.png", words: ["stressed", "overwhelmed", "tense", "gestrest", "overweldigd", "gespannen", "😰", ":cold_sweat:"] }],
  ["suspicious", { image: "./images/suspicious.png", words: ["suspicious", "doubtful", "skeptical", "verdacht", "twijfelachtig", "sceptisch", "🤨", "::"] }],
  ["unimpressed", { image: "./images/unimpressed.png", words: ["unimpressed", "indifferent", "apathetic", "onverschillig", "apathisch", "niet onder de indruk", "😒", ":unamused:"] }],
  ["working-hard", { image: "./images/working-hard.png", words: ["working hard", "focused", "dedicated", "hard werken", "focus", "gefocust", "toegewijd", "💪", ":muscle:"] }],
  ["yawning", { image: "./images/yawning.png", words: ["yawning", "tired", "sleepy", "geeuwen", "moe", "slaperig", "😪"] }]
]);

Deno.cron("track during workhours", "*/2 6-16 * * 2-6", () => {

  fetchProfilePicture()
    .then(async data => {
      if (data) {
        console.log("👤 Profile data:", data);
        //check if the profile emonji is in the map and if the avatar_hash is not the same as stored in kv set the profile picture
        const status_text = data.profile.status_text || "";
        const status_emoji = data.profile.status_emoji || "";
        const avatarHash = data.profile.avatar_hash;
        const findStateKeyByStatusText = (status_text: string) => {
          for (const [key, value] of stateToWordsAndImageMap.entries()) {
            if (value.words.some(word => status_text.toLowerCase().includes(word))) {
              return key;
            }
          }
          return null;
        };
        const findStateKeyByStatusEmoji = (status_emoji: string) => {
          for (const [key, value] of stateToWordsAndImageMap.entries()) {
            if (value.words.some(word => status_emoji.toLowerCase().includes(word))) {
              return key;
            }
          }
          return null;
        };
        console.log("💭 Status text:", status_text);
        const matchedState = findStateKeyByStatusText(status_text) || findStateKeyByStatusEmoji(status_emoji) || "default";
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

Deno.serve(() => new Response("✨ Slack profile picture updater is running!"));