import { BaseComponent } from "../../baseComponent";
import TranslateServiceConfig from "./config";
const googleTranslate = require("google-translate");

export type Translator = {
    translate(strings: string, target: string): Promise<TranslateResult>;
    translateArray(strings: string[], target: string): Promise<TranslateResult[]>;
    detect(strings: string): Promise<DetectResult>;
}

export type TranslateResult = {
    translatedText: string;
    originalText: string;
    detectedSourceLanguage: string;
}

export type DetectResult = {
    language: string;
    isReliable: boolean;
    confidence: number;
    originalText: string;
}

export default class TranslateService extends BaseComponent {

    public async translate(owner: string, repo: string, strings: string, target: string): Promise<TranslateResult> {
        let config = await this.getConfig(owner, repo);
        if (!config.enable) return Promise.resolve(null);
        return this.getTranslator(config.googleTranslationKey).translate(strings, target);
    }

    public async translateArray(owner: string, repo: string, strings: string[], target: string): Promise<TranslateResult[]> {
        let config = await this.getConfig(owner, repo);
        if (!config.enable) return Promise.resolve(null);
        return this.getTranslator(config.googleTranslationKey).translateArray(strings, target);
    }

    public async detect(owner: string, repo: string, strings: string): Promise<DetectResult> {
        let config = await this.getConfig(owner, repo);
        if (!config.enable) return Promise.resolve(null);
        return this.getTranslator(config.googleTranslationKey).detect(strings);
    }

    private getConfig(owner: string, repo: string): Promise<TranslateServiceConfig> {
        return this.app.configService.getConfigByName(owner, repo, TranslateServiceConfig);
    }

    private getTranslator(key: string): Translator {
        let translator = googleTranslate(key);
        return {
            translate: (strings: string, target: string): Promise<TranslateResult> => {
                return new Promise<TranslateResult>(resolve => {
                    translator.translate(strings, target, (err: any, result: any): void => {
                        if (err) {
                            this.logger.error(`Error happened when translate. ` +
                                `err=${JSON.stringify(err)}, strings=${strings}`);
                            resolve();
                        } else {
                            resolve({
                                translatedText: result.translatedText,
                                originalText: result.originalText,
                                detectedSourceLanguage: result.detectedSourceLanguage
                            });
                        }
                    });
                });
            },
            translateArray: (strings: string[], target: string): Promise<TranslateResult[]> => {
                return new Promise<TranslateResult[]>(resolve => {
                    translator.translate(strings, target, (err: any, result: any[]): void => {
                        if (err) {
                            this.logger.error(`Error happened when translateArray. ` +
                                `err=${JSON.stringify(err)}, strings=${strings}`);
                            resolve();
                        } else {
                            resolve(result.map((res: any) => {
                                return {
                                    translatedText: res.translatedText,
                                    originalText: res.originalText,
                                    detectedSourceLanguage: res.detectedSourceLanguage
                                }
                            }));
                        }
                    });
                });
            },
            detect: (strings: string): Promise<DetectResult> => {
                return new Promise<DetectResult>(resolve => {
                    translator.detect(strings, (err: any, result: any) => {
                        if (err) {
                            this.logger.error(`Error happened when detect language. err=${err}, strings=${strings}`);
                            resolve();
                        } else {
                            resolve({
                                language: result.language,
                                isReliable: result.isReliable,
                                confidence: result.confidence,
                                originalText: result.originalText
                            });
                        }
                    });
                });
            }
        }
    }
}
