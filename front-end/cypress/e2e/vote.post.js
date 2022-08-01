import { faker } from "@faker-js/faker";

import * as setup from "./setup.js";

before(() => {
    cy.resetPosts();
    const song = setup.createRecommendation();
    cy.createPost(song);
  });