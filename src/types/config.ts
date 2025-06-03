export type AIProvider = 'openai' | 'anthropic';

export interface NamingPattern {
  pattern: string;
  description: string;
  example: string;
}

export interface FileTypeConfig {
  enabled: boolean;
  namingPatterns: {
    [key: string]: NamingPattern;
  };
  organizationRules: {
    byDate?: boolean;
    byType?: boolean;
    byProject?: boolean;
    customPath?: string;
  };
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface OrganizationConfig {
  confidenceThreshold: number;
  createBackups: boolean;
  preserveOriginalNames: boolean;
  maxDepth: number;
  excludePatterns: string[];
  includePatterns: string[];
}

export interface UserConfig {
  ai: AIConfig;
  organization: OrganizationConfig;
  fileTypes: {
    images: FileTypeConfig;
    videos: FileTypeConfig;
    audio: FileTypeConfig;
    documents: FileTypeConfig;
    spreadsheets: FileTypeConfig;
    presentations: FileTypeConfig;
    code: FileTypeConfig;
    archives: FileTypeConfig;
    misc: FileTypeConfig;
  };
  customCategories?: {
    [categoryName: string]: {
      extensions: string[];
      config: FileTypeConfig;
    };
  };
}

export const DEFAULT_CONFIG: UserConfig = {
  ai: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.3,
    timeout: 90000
  },
  organization: {
    confidenceThreshold: 0.7,
    createBackups: true,
    preserveOriginalNames: false,
    maxDepth: 5,
    excludePatterns: ['.DS_Store', 'Thumbs.db', '*.tmp', '*.cache'],
    includePatterns: ['*']
  },
  fileTypes: {
    images: {
      enabled: true,
      namingPatterns: {
        date: {
          pattern: 'YYYY/MM/YYYY-MM-DD_filename',
          description: 'Organize by year/month with date prefix',
          example: '2024/03/2024-03-15_vacation.jpg'
        },
        event: {
          pattern: 'events/EVENT_NAME/YYYY-MM-DD_filename',
          description: 'Organize by event with date',
          example: 'events/birthday_party/2024-03-15_cake.jpg'
        }
      },
      organizationRules: {
        byDate: true,
        byType: false
      }
    },
    videos: {
      enabled: true,
      namingPatterns: {
        date: {
          pattern: 'YYYY/MM/YYYY-MM-DD_filename',
          description: 'Organize by year/month with date prefix',
          example: '2024/03/2024-03-15_wedding.mp4'
        }
      },
      organizationRules: {
        byDate: true,
        byType: false
      }
    },
    audio: {
      enabled: true,
      namingPatterns: {
        artist: {
          pattern: 'music/ARTIST/ALBUM/filename',
          description: 'Organize by artist and album',
          example: 'music/The Beatles/Abbey Road/Come Together.mp3'
        }
      },
      organizationRules: {
        byType: true
      }
    },
    documents: {
      enabled: true,
      namingPatterns: {
        category: {
          pattern: 'documents/CATEGORY/YYYY/filename',
          description: 'Organize by category and year',
          example: 'documents/financial/2024/tax_return.pdf'
        }
      },
      organizationRules: {
        byType: true,
        byDate: false
      }
    },
    spreadsheets: {
      enabled: true,
      namingPatterns: {
        category: {
          pattern: 'documents/spreadsheets/CATEGORY/filename',
          description: 'Organize by category',
          example: 'documents/spreadsheets/budgets/monthly_budget.xlsx'
        }
      },
      organizationRules: {
        byType: true
      }
    },
    presentations: {
      enabled: true,
      namingPatterns: {
        category: {
          pattern: 'documents/presentations/CATEGORY/filename',
          description: 'Organize by category',
          example: 'documents/presentations/work/quarterly_review.pptx'
        }
      },
      organizationRules: {
        byType: true
      }
    },
    code: {
      enabled: true,
      namingPatterns: {
        project: {
          pattern: 'projects/PROJECT_NAME/filename',
          description: 'Organize by project name',
          example: 'projects/my_app/index.js'
        }
      },
      organizationRules: {
        byProject: true
      }
    },
    archives: {
      enabled: true,
      namingPatterns: {
        type: {
          pattern: 'archives/filename',
          description: 'Simple archive organization',
          example: 'archives/backup_2024.zip'
        }
      },
      organizationRules: {
        byType: true
      }
    },
    misc: {
      enabled: true,
      namingPatterns: {
        type: {
          pattern: 'misc/filename',
          description: 'Miscellaneous files',
          example: 'misc/readme.txt'
        }
      },
      organizationRules: {
        byType: true
      }
    }
  }
};