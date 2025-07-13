interface TypeScriptConfig {
  compilerOptions?: Record<string, any>;
  include?: string[];
  exclude?: string[];
  extends?: string;
}

declare const config: TypeScriptConfig;
export default config;