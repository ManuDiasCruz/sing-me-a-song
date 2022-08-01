import { faker } from "@faker-js/faker";
import supertest from "supertest";

import { prisma } from "../src/database.js";
import app from "../src/app.js";

const agent = supertest(app);

beforeEach(async () => {
    await prisma.recommendation.deleteMany({});
})

function createRecommendation() {
    const randomUrlGen = require("random-youtube-music-video");
    const youtubeUrl = randomUrlGen.getRandomMusicVideoUrl();

    const name = faker.name.findName();
    const youtubeLink = youtubeUrl;
  
    return { name, youtubeLink };
}

describe("Integration tests: POST /recommendations", () => {
    it("Create a recommendation", async () => {
        const body = createRecommendation();
    
        const response = await agent.post("/recommendations").send(body);
        expect(response.status).toBe(201);
    
        const { name, youtubeLink } = body;
        const checkUser = await prisma.recommendation.findFirst({
            where: { name, youtubeLink },
        });
    
        expect(checkUser).not.toBeNull();
    });
  
    it("Create a conflicting recommendation", async () => {
        const body = createRecommendation();
    
        const create = await agent.post("/recommendations").send(body);
        expect(create.status).toBe(201);
    
        const conflict = await agent.post("/recommendations").send(body);
        expect(conflict.status).toBe(409);
    });
  
    it("Create a 'invalid data' recommendation", async () => {
        const response = await agent.post("/recommendations").send({});
        expect(response.status).toBe(422);
    });
});

describe("Integration tests: GET /recommendations", () => {
    it("List recommendations", async () => {
        const recommendation1 = createRecommendation();
        const recommendation2 = createRecommendation();
        const recommendation3 = createRecommendation();
        
        await agent.post("/recommendations").send(recommendation1);
        await agent.post("/recommendations").send(recommendation2);
        await agent.post("/recommendations").send(recommendation3);
    
        const response = await agent.get("/recommendations");
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(3);
    
        expect(response.body[0].name).toBe(recommendation2.name);
        expect(response.body[0].youtubeLink).toBe(recommendation2.youtubeLink);
    
        expect(response.body[1].name).toBe(recommendation1.name);
        expect(response.body[1].youtubeLink).toBe(recommendation1.youtubeLink);

        expect(response.body[2].name).toBe(recommendation3.name);
        expect(response.body[2].youtubeLink).toBe(recommendation3.youtubeLink);
    });
  
    it("Show empty recommendations list", async () => {
        const response = await agent.get("/recommendations");
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(0);
    });
  
    it("List a random recommendation", async () => {
        const recommendation1 = createRecommendation();
        const recommendation2 = createRecommendation();
        const recommendation3 = createRecommendation();
    
        await agent.post("/recommendations").send(recommendation1);
        await agent.post("/recommendations").send(recommendation2);
        await agent.post("/recommendations").send(recommendation3);
    
        const response = await agent.get("/recommendations/random");
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("name");
        expect(`${recommendation1.name} ${recommendation2.name} ${recommendation3.name}`).toContain(response.body.name);
    });
  
    it("List top recommendations", async () => {
        const recommendation1 = createRecommendation();
        const recommendation2 = createRecommendation();
        const recommendation3 = createRecommendation();
    
        const { body } = await agent.post("/recommendations").send(recommendation1);
        await agent.post("/recommendations").send(recommendation2);
        await agent.post("/recommendations").send(recommendation3);
    
        await agent.post(`/recommendations/${body.id}/upvote`);
    
        const response = await agent.get("/recommendations/top/2");
    
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
    
        expect(response.body[0].name).toBe(recommendation1.name);
        expect(response.body[0].youtubeLink).toBe(recommendation1.youtubeLink);
    
        expect(response.body[1].name).toBe(recommendation2.name);
        expect(response.body[1].youtubeLink).toBe(recommendation2.youtubeLink);
    });
  
    it("Show a recommendation by id", async () => {
        const body = createRecommendation();
    
        await agent.post("/recommendations").send(body);
        
        const recommendation = await prisma.recommendation.findFirst({
            where: { name: body.name, youtubeLink: body.youtubeLink },
        });
    
        const response = await agent.get(`/recommendations/${recommendation.id}`);
    
        expect(response.status).toBe(200);
        expect(response.body.name).toBe(recommendation.name);
        expect(response.body.youtubeLink).toBe(recommendation.youtubeLink);
    });
});
  
describe("Integration tests: POST /upvote and /downvote", () => {
    it("Upvote a recommendation", async () => {
        const body = createRecommendation();
        await agent.post("/recommendations").send(body);
    
        const recommendation = await prisma.recommendation.findFirst({
            where: { name: body.name, youtubeLink: body.youtubeLink },
        });
    
        await agent.post(`/recommendations/${recommendation.id}/upvote`);
    
        await agent.post(`/recommendations/${recommendation.id}/upvote`);
    
        const response = await agent.get(`/recommendations/${recommendation.id}`);
    
        expect(response.status).toBe(200);
        expect(response.body.score).toBe(2);
    });
  
    it("Upvote non-existent recommendation", async () => {
        const response = await agent.post("/recommendations/1/upvote");
        expect(response.status).toBe(404);
    });
  
    it("Downvote a recommendation", async () => {
        const body = createRecommendation();
    
        await agent.post("/recommendations").send(body);
    
        const recommendation = await prisma.recommendation.findFirst({
            where: { name: body.name, youtubeLink: body.youtubeLink },
        });
    
        await agent.post(`/recommendations/${recommendation.id}/upvote`);
        await agent.post(`/recommendations/${recommendation.id}/upvote`);
        await agent.post(`/recommendations/${recommendation.id}/downvote`);
    
        const response = await agent.get(`/recommendations/${recommendation.id}`);
    
        expect(response.status).toBe(200);
        expect(response.body.score).toBe(1);
    });
  
    it("Downvote non-existent recommendation", async () => {
        const response = await agent.post("/recommendations/1/downvote");
        expect(response.status).toBe(404);
    });
});

