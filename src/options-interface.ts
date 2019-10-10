export interface OptionsInterface {
    root: string;
    headers: object;
    cache: number;
    showDir: boolean;
    autoIndex: boolean;
    showDotfiles: boolean;
    gzip: boolean;
    contentType: string;
    ext: boolean | string;
    before: any[];
    logFn: (res, req, err?) => void;
    rewrite: RegExp;
    cors: boolean;
    corsHeaders: string;
    robots: any;
    proxy: string;
    https: any;
}
