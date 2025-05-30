export const testResponse = {
    id: "resp_6838d84f50ac819d84709a5b7c11dc320893f674f3b633d9",
    object: "response",
    created_at: 1748555855,
    status: "completed",
    background: false,
    error: null,
    incomplete_details: null,
    instructions: null,
    max_output_tokens: null,
    model: "gpt-4o-2024-08-06",
    output: [
      {
        id: "msg_6838d85c1b30819dab00c222e97c53730893f674f3b633d9",
        type: "message",
        status: "completed",
        content: [
          {
            type: "output_text",
            annotations: [
            ],
            text: "\n\n{\"suggestions\":[{\"file\":{\"path\":\"test-sandbox/media-library/Avengers Endgame (2019) [1080p].mkv\",\"name\":\"Avengers Endgame (2019) [1080p]\",\"extension\":\"mkv\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"Movies/Avengers Endgame (2019) [1080p].mkv\",\"reason\":\"It's a standalone movie, best placed in a Movies folder.\",\"confidence\":0.9,\"category\":\"Movies\",\"metadata\":{}},{\"file\":{\"path\":\"test-sandbox/media-library/Breaking.Bad.S01E01.1080p.mkv\",\"name\":\"Breaking.Bad.S01E01.1080p\",\"extension\":\"mkv\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"TV Shows/Breaking Bad/Season 1/Breaking.Bad.S01E01.1080p.mkv\",\"reason\":\"Part of the Breaking Bad series, season 1.\",\"confidence\":0.95,\"category\":\"TV Shows\",\"metadata\":{}},{\"file\":{\"path\":\"test-sandbox/media-library/Budget_2024_Q1.xlsx\",\"name\":\"Budget_2024_Q1\",\"extension\":\"xlsx\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"Documents/Budgets/Budget_2024_Q1.xlsx\",\"reason\":\"This is a budget document probably related to financial planning.\",\"confidence\":0.8,\"category\":\"Documents\",\"metadata\":{}},{\"file\":{\"path\":\"test-sandbox/media-library/Jon Wick Chapter 4 2023 HDR.mkv\",\"name\":\"Jon Wick Chapter 4 2023 HDR\",\"extension\":\"mkv\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"Movies/Jon Wick Chapter 4 2023 HDR.mkv\",\"reason\":\"Another standalone movie, should be organized with other movies.\",\"confidence\":0.9,\"category\":\"Movies\",\"metadata\":{}},{\"file\":{\"path\":\"test-sandbox/media-library/The Beatles - Abbey Road - 01 - Come Together.mp3\",\"name\":\"The Beatles - Abbey Road - 01 - Come Together\",\"extension\":\"mp3\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"Music/The Beatles/Abbey Road/The Beatles - Abbey Road - 01 - Come Together.mp3\",\"reason\":\"This file is part of a music album, likely Abbey Road by The Beatles.\",\"confidence\":0.95,\"category\":\"Music\",\"metadata\":{}}],\"reasoning\":\"Here's what I've discovered from the initial file analysis:\\n\\n**Content Types:**\\n1. Movies (e.g., 'Avengers Endgame (2019)', 'Pulp Fiction 1994 Director's Cut')\\n2. TV Shows (e.g., 'Breaking.Bad.S01E01', 'Stranger Things S04E02 Vecnas Curse')\\n3. Music (e.g., 'Led Zeppelin - Stairway to Heaven', 'The Beatles - Abbey Road - 01 - Come Together')\\n4. Documents (e.g., 'Budget_2024_Q1.xlsx', 'Project_Plan_v2.docx')\\n\\n**Naming Patterns:**\\n- TV shows have episode indicators like S01E01.\\n- Movies appear to be identified by their titles and occasionally release year or quality tags (e.g., 1080p).\\n- Music files contain artist and album details.\\n- Documents follow a version or quarter pattern (e.g., 'Project_Plan_v2').\\n\\n**Suggested Categories:**\\n- **Movies**: For standalone movie files.\\n- **TV Shows**: For episodic content.\\n- **Music**: For audio files by artists or albums.\\n- **Documents**: For files that are non-media, like spreadsheets or text documents.\\n\\n**Initial Organization Ideas:**\\n- Create separate folders for **Movies**, **TV Shows**, **Music**, and **Documents**.\\n- Within each category, further organize by series (for TV shows) or albums (for music).\\n\\n**Clarification Needed:**\\nIt would be helpful to confirm if there are any specific preferences you have for sub-categorization or if there are any additional specific categories you'd like me to consider.\",\"clarificationNeeded\":{\"questions\":[\"Would you like any specific sub-categories within Movies or TV Shows?\",\"Are there any different categories you have in mind other than Movies, TV Shows, Music, and Documents?\"],\"reason\":\"To ensure the suggested organization aligns with your preferences and any unique criteria you might have.\"}}",
            parsed: {
              suggestions: [
                {
                  file: {
                    path: "test-sandbox/media-library/Avengers Endgame (2019) [1080p].mkv",
                    name: "Avengers Endgame (2019) [1080p]",
                    extension: "mkv",
                    size: 0,
                    modified: "2025-05-28",
                    type: "file",
                  },
                  suggestedPath: "Movies/Avengers Endgame (2019) [1080p].mkv",
                  reason: "It's a standalone movie, best placed in a Movies folder.",
                  confidence: 0.9,
                  category: "Movies",
                  metadata: {
                  },
                },
                {
                  file: {
                    path: "test-sandbox/media-library/Breaking.Bad.S01E01.1080p.mkv",
                    name: "Breaking.Bad.S01E01.1080p",
                    extension: "mkv",
                    size: 0,
                    modified: "2025-05-28",
                    type: "file",
                  },
                  suggestedPath: "TV Shows/Breaking Bad/Season 1/Breaking.Bad.S01E01.1080p.mkv",
                  reason: "Part of the Breaking Bad series, season 1.",
                  confidence: 0.95,
                  category: "TV Shows",
                  metadata: {
                  },
                },
                {
                  file: {
                    path: "test-sandbox/media-library/Budget_2024_Q1.xlsx",
                    name: "Budget_2024_Q1",
                    extension: "xlsx",
                    size: 0,
                    modified: "2025-05-28",
                    type: "file",
                  },
                  suggestedPath: "Documents/Budgets/Budget_2024_Q1.xlsx",
                  reason: "This is a budget document probably related to financial planning.",
                  confidence: 0.8,
                  category: "Documents",
                  metadata: {
                  },
                },
                {
                  file: {
                    path: "test-sandbox/media-library/Jon Wick Chapter 4 2023 HDR.mkv",
                    name: "Jon Wick Chapter 4 2023 HDR",
                    extension: "mkv",
                    size: 0,
                    modified: "2025-05-28",
                    type: "file",
                  },
                  suggestedPath: "Movies/Jon Wick Chapter 4 2023 HDR.mkv",
                  reason: "Another standalone movie, should be organized with other movies.",
                  confidence: 0.9,
                  category: "Movies",
                  metadata: {
                  },
                },
                {
                  file: {
                    path: "test-sandbox/media-library/The Beatles - Abbey Road - 01 - Come Together.mp3",
                    name: "The Beatles - Abbey Road - 01 - Come Together",
                    extension: "mp3",
                    size: 0,
                    modified: "2025-05-28",
                    type: "file",
                  },
                  suggestedPath: "Music/The Beatles/Abbey Road/The Beatles - Abbey Road - 01 - Come Together.mp3",
                  reason: "This file is part of a music album, likely Abbey Road by The Beatles.",
                  confidence: 0.95,
                  category: "Music",
                  metadata: {
                  },
                },
              ],
              reasoning: "Here's what I've discovered from the initial file analysis:\n\n**Content Types:**\n1. Movies (e.g., 'Avengers Endgame (2019)', 'Pulp Fiction 1994 Director's Cut')\n2. TV Shows (e.g., 'Breaking.Bad.S01E01', 'Stranger Things S04E02 Vecnas Curse')\n3. Music (e.g., 'Led Zeppelin - Stairway to Heaven', 'The Beatles - Abbey Road - 01 - Come Together')\n4. Documents (e.g., 'Budget_2024_Q1.xlsx', 'Project_Plan_v2.docx')\n\n**Naming Patterns:**\n- TV shows have episode indicators like S01E01.\n- Movies appear to be identified by their titles and occasionally release year or quality tags (e.g., 1080p).\n- Music files contain artist and album details.\n- Documents follow a version or quarter pattern (e.g., 'Project_Plan_v2').\n\n**Suggested Categories:**\n- **Movies**: For standalone movie files.\n- **TV Shows**: For episodic content.\n- **Music**: For audio files by artists or albums.\n- **Documents**: For files that are non-media, like spreadsheets or text documents.\n\n**Initial Organization Ideas:**\n- Create separate folders for **Movies**, **TV Shows**, **Music**, and **Documents**.\n- Within each category, further organize by series (for TV shows) or albums (for music).\n\n**Clarification Needed:**\nIt would be helpful to confirm if there are any specific preferences you have for sub-categorization or if there are any additional specific categories you'd like me to consider.",
              clarificationNeeded: {
                questions: [
                  "Would you like any specific sub-categories within Movies or TV Shows?",
                  "Are there any different categories you have in mind other than Movies, TV Shows, Music, and Documents?",
                ],
                reason: "To ensure the suggested organization aligns with your preferences and any unique criteria you might have.",
              },
            },
          },
        ],
        role: "assistant",
      },
    ],
    parallel_tool_calls: true,
    previous_response_id: null,
    reasoning: {
      effort: null,
      summary: null,
    },
    service_tier: "default",
    store: true,
    temperature: 1,
    text: {
      format: {
        type: "json_schema",
        description: null,
        name: "result",
        schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  file: {
                    anyOf: [
                      {
                        type: "object",
                        properties: {
                          path: {
                            type: "string",
                          },
                          name: {
                            type: "string",
                          },
                          extension: {
                            type: "string",
                          },
                          size: {
                            type: "number",
                          },
                          modified: {
                            type: "string",
                          },
                          type: {
                            type: "string",
                            enum: [
                              "file",
                              "directory",
                            ],
                          },
                        },
                        required: [
                          "path",
                          "name",
                          "extension",
                          "size",
                          "modified",
                          "type",
                        ],
                        additionalProperties: false,
                      },
                      {
                        type: "null",
                      },
                    ],
                  },
                  suggestedPath: {
                    type: "string",
                  },
                  reason: {
                    type: "string",
                  },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                  },
                  category: {
                    type: "string",
                    nullable: true,
                  },
                  metadata: {
                    anyOf: [
                      {
                        type: "object",
                        properties: {
                        },
                        additionalProperties: false,
                      },
                      {
                        type: "null",
                      },
                    ],
                  },
                },
                required: [
                  "file",
                  "suggestedPath",
                  "reason",
                  "confidence",
                  "category",
                  "metadata",
                ],
                additionalProperties: false,
              },
            },
            reasoning: {
              type: "string",
            },
            clarificationNeeded: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                    },
                    reason: {
                      type: "string",
                    },
                  },
                  required: [
                    "questions",
                    "reason",
                  ],
                  additionalProperties: false,
                },
                {
                  type: "null",
                },
              ],
            },
          },
          required: [
            "suggestions",
            "reasoning",
            "clarificationNeeded",
          ],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    tool_choice: "auto",
    tools: [
    ],
    top_p: 1,
    truncation: "disabled",
    usage: {
      input_tokens: 2118,
      input_tokens_details: {
        cached_tokens: 0,
      },
      output_tokens: 981,
      output_tokens_details: {
        reasoning_tokens: 0,
      },
      total_tokens: 3099,
    },
    user: null,
    metadata: {
    },
    output_text: "\n\n{\"suggestions\":[{\"file\":{\"path\":\"test-sandbox/media-library/Avengers Endgame (2019) [1080p].mkv\",\"name\":\"Avengers Endgame (2019) [1080p]\",\"extension\":\"mkv\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"Movies/Avengers Endgame (2019) [1080p].mkv\",\"reason\":\"It's a standalone movie, best placed in a Movies folder.\",\"confidence\":0.9,\"category\":\"Movies\",\"metadata\":{}},{\"file\":{\"path\":\"test-sandbox/media-library/Breaking.Bad.S01E01.1080p.mkv\",\"name\":\"Breaking.Bad.S01E01.1080p\",\"extension\":\"mkv\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"TV Shows/Breaking Bad/Season 1/Breaking.Bad.S01E01.1080p.mkv\",\"reason\":\"Part of the Breaking Bad series, season 1.\",\"confidence\":0.95,\"category\":\"TV Shows\",\"metadata\":{}},{\"file\":{\"path\":\"test-sandbox/media-library/Budget_2024_Q1.xlsx\",\"name\":\"Budget_2024_Q1\",\"extension\":\"xlsx\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"Documents/Budgets/Budget_2024_Q1.xlsx\",\"reason\":\"This is a budget document probably related to financial planning.\",\"confidence\":0.8,\"category\":\"Documents\",\"metadata\":{}},{\"file\":{\"path\":\"test-sandbox/media-library/Jon Wick Chapter 4 2023 HDR.mkv\",\"name\":\"Jon Wick Chapter 4 2023 HDR\",\"extension\":\"mkv\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"Movies/Jon Wick Chapter 4 2023 HDR.mkv\",\"reason\":\"Another standalone movie, should be organized with other movies.\",\"confidence\":0.9,\"category\":\"Movies\",\"metadata\":{}},{\"file\":{\"path\":\"test-sandbox/media-library/The Beatles - Abbey Road - 01 - Come Together.mp3\",\"name\":\"The Beatles - Abbey Road - 01 - Come Together\",\"extension\":\"mp3\",\"size\":0,\"modified\":\"2025-05-28\",\"type\":\"file\"},\"suggestedPath\":\"Music/The Beatles/Abbey Road/The Beatles - Abbey Road - 01 - Come Together.mp3\",\"reason\":\"This file is part of a music album, likely Abbey Road by The Beatles.\",\"confidence\":0.95,\"category\":\"Music\",\"metadata\":{}}],\"reasoning\":\"Here's what I've discovered from the initial file analysis:\\n\\n**Content Types:**\\n1. Movies (e.g., 'Avengers Endgame (2019)', 'Pulp Fiction 1994 Director's Cut')\\n2. TV Shows (e.g., 'Breaking.Bad.S01E01', 'Stranger Things S04E02 Vecnas Curse')\\n3. Music (e.g., 'Led Zeppelin - Stairway to Heaven', 'The Beatles - Abbey Road - 01 - Come Together')\\n4. Documents (e.g., 'Budget_2024_Q1.xlsx', 'Project_Plan_v2.docx')\\n\\n**Naming Patterns:**\\n- TV shows have episode indicators like S01E01.\\n- Movies appear to be identified by their titles and occasionally release year or quality tags (e.g., 1080p).\\n- Music files contain artist and album details.\\n- Documents follow a version or quarter pattern (e.g., 'Project_Plan_v2').\\n\\n**Suggested Categories:**\\n- **Movies**: For standalone movie files.\\n- **TV Shows**: For episodic content.\\n- **Music**: For audio files by artists or albums.\\n- **Documents**: For files that are non-media, like spreadsheets or text documents.\\n\\n**Initial Organization Ideas:**\\n- Create separate folders for **Movies**, **TV Shows**, **Music**, and **Documents**.\\n- Within each category, further organize by series (for TV shows) or albums (for music).\\n\\n**Clarification Needed:**\\nIt would be helpful to confirm if there are any specific preferences you have for sub-categorization or if there are any additional specific categories you'd like me to consider.\",\"clarificationNeeded\":{\"questions\":[\"Would you like any specific sub-categories within Movies or TV Shows?\",\"Are there any different categories you have in mind other than Movies, TV Shows, Music, and Documents?\"],\"reason\":\"To ensure the suggested organization aligns with your preferences and any unique criteria you might have.\"}}",
    output_parsed: {
      suggestions: [
        {
          file: {
            path: "test-sandbox/media-library/Avengers Endgame (2019) [1080p].mkv",
            name: "Avengers Endgame (2019) [1080p]",
            extension: "mkv",
            size: 0,
            modified: "2025-05-28",
            type: "file",
          },
          suggestedPath: "Movies/Avengers Endgame (2019) [1080p].mkv",
          reason: "It's a standalone movie, best placed in a Movies folder.",
          confidence: 0.9,
          category: "Movies",
          metadata: {
          },
        },
        {
          file: {
            path: "test-sandbox/media-library/Breaking.Bad.S01E01.1080p.mkv",
            name: "Breaking.Bad.S01E01.1080p",
            extension: "mkv",
            size: 0,
            modified: "2025-05-28",
            type: "file",
          },
          suggestedPath: "TV Shows/Breaking Bad/Season 1/Breaking.Bad.S01E01.1080p.mkv",
          reason: "Part of the Breaking Bad series, season 1.",
          confidence: 0.95,
          category: "TV Shows",
          metadata: {
          },
        },
        {
          file: {
            path: "test-sandbox/media-library/Budget_2024_Q1.xlsx",
            name: "Budget_2024_Q1",
            extension: "xlsx",
            size: 0,
            modified: "2025-05-28",
            type: "file",
          },
          suggestedPath: "Documents/Budgets/Budget_2024_Q1.xlsx",
          reason: "This is a budget document probably related to financial planning.",
          confidence: 0.8,
          category: "Documents",
          metadata: {
          },
        },
        {
          file: {
            path: "test-sandbox/media-library/Jon Wick Chapter 4 2023 HDR.mkv",
            name: "Jon Wick Chapter 4 2023 HDR",
            extension: "mkv",
            size: 0,
            modified: "2025-05-28",
            type: "file",
          },
          suggestedPath: "Movies/Jon Wick Chapter 4 2023 HDR.mkv",
          reason: "Another standalone movie, should be organized with other movies.",
          confidence: 0.9,
          category: "Movies",
          metadata: {
          },
        },
        {
          file: {
            path: "test-sandbox/media-library/The Beatles - Abbey Road - 01 - Come Together.mp3",
            name: "The Beatles - Abbey Road - 01 - Come Together",
            extension: "mp3",
            size: 0,
            modified: "2025-05-28",
            type: "file",
          },
          suggestedPath: "Music/The Beatles/Abbey Road/The Beatles - Abbey Road - 01 - Come Together.mp3",
          reason: "This file is part of a music album, likely Abbey Road by The Beatles.",
          confidence: 0.95,
          category: "Music",
          metadata: {
          },
        },
      ],
      reasoning: "Here's what I've discovered from the initial file analysis:\n\n**Content Types:**\n1. Movies (e.g., 'Avengers Endgame (2019)', 'Pulp Fiction 1994 Director's Cut')\n2. TV Shows (e.g., 'Breaking.Bad.S01E01', 'Stranger Things S04E02 Vecnas Curse')\n3. Music (e.g., 'Led Zeppelin - Stairway to Heaven', 'The Beatles - Abbey Road - 01 - Come Together')\n4. Documents (e.g., 'Budget_2024_Q1.xlsx', 'Project_Plan_v2.docx')\n\n**Naming Patterns:**\n- TV shows have episode indicators like S01E01.\n- Movies appear to be identified by their titles and occasionally release year or quality tags (e.g., 1080p).\n- Music files contain artist and album details.\n- Documents follow a version or quarter pattern (e.g., 'Project_Plan_v2').\n\n**Suggested Categories:**\n- **Movies**: For standalone movie files.\n- **TV Shows**: For episodic content.\n- **Music**: For audio files by artists or albums.\n- **Documents**: For files that are non-media, like spreadsheets or text documents.\n\n**Initial Organization Ideas:**\n- Create separate folders for **Movies**, **TV Shows**, **Music**, and **Documents**.\n- Within each category, further organize by series (for TV shows) or albums (for music).\n\n**Clarification Needed:**\nIt would be helpful to confirm if there are any specific preferences you have for sub-categorization or if there are any additional specific categories you'd like me to consider.",
      clarificationNeeded: {
        questions: [
          "Would you like any specific sub-categories within Movies or TV Shows?",
          "Are there any different categories you have in mind other than Movies, TV Shows, Music, and Documents?",
        ],
        reason: "To ensure the suggested organization aligns with your preferences and any unique criteria you might have.",
      },
    },
  }