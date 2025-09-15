import { AppConfig } from '../types/index.js';
/**
 * 获取应用配置
 */
export declare function getAppConfig(): AppConfig;
/**
 * 验证配置是否有效
 */
export declare function validateConfig(config: AppConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * 获取新闻源列表
 */
export declare function getNewsSources(): {
    id: string;
    name: string;
    enabled: boolean;
}[];
//# sourceMappingURL=index.d.ts.map