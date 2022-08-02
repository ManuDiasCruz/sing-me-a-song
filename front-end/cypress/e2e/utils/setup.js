import { faker } from "@faker-js/faker";

export async function createRecommendation() {
    const name = faker.name.findName();

    const randomUrlGen = require("random-youtube-music-video");
    const youtubeLink = await randomUrlGen.getRandomMusicVideoUrl();    
  
    return { name, youtubeLink };
}

export function createWrongLink(name) {
    const name = faker.name.findName();
    const youtubeLink = name;    
  
    return { name, youtubeLink };
}