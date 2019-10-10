import { OptionsInterface } from "./options-interface";
import * as fs from "fs";
import * as corser from 'corser';
import * as ecstatic from 'ecstatic';
import * as httpProxy from 'http-proxy';
import * as union from 'union';

const PUBLIC_ROOT = './public';
const DEFAULT_ROOT = './';
const DEFAULT_CACHE = 3600;
const DEFAULT_CONTENT_TYPE = 'application/octet-stream';
const DEFAULT_EXT = 'html';

export class HttpServerR implements OptionsInterface {
    root: string;
    headers: object;
    cache: number;
    showDir: boolean;
    autoIndex: boolean;
    before: any[];
    contentType: string;
    cors: boolean;
    corsHeaders: string;
    ext: boolean | string;
    gzip: boolean;
    https: any;
    logFn: (req, res, err?) => void;
    proxy: string;
    rewrite: RegExp;
    robots: any;
    showDotfiles: boolean;
    server: any;

    constructor(options: Partial<OptionsInterface>) {
        options = options || {};

        if (options.root) {
            this.root = options.root;
        } else {
            try {
                fs.lstatSync(PUBLIC_ROOT);
                this.root = PUBLIC_ROOT;
            } catch (e) {
                this.root = DEFAULT_ROOT;
            }

        }

        this.headers = options.headers || {};

        this.cache = isNaN(options.cache) ? DEFAULT_CACHE : options.cache;
        this.showDir = options.showDir;
        this.autoIndex = options.autoIndex;
        this.showDotfiles = options.showDotfiles;
        this.gzip = options.gzip;
        this.contentType = options.contentType || DEFAULT_CONTENT_TYPE;

        if (options.ext) {
            this.ext = options.ext === true ? DEFAULT_EXT : options.ext;
        }

        let before = options.before ? options.before.slice() : [];

        before.push((req, res) => {
            if (options.logFn) {
                options.logFn(req, res);
            }

            res.emit('next');
        });

        if (options.rewrite) {
            before.push((req, res) => {
                let regex = new RegExp(options.rewrite[0]);

                if (req.url.math(regex)) {
                    req.firstUrl = req.url;
                    req.url = req.url.replace(regex, options.rewrite[1]);
                }

                res.emit('next');
            });
        }

        if (options.cors) {
            this.headers['Access-Control-Allow-Origin'] = '*';
            this.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Range';
            if (options.corsHeaders) {
                let self = this;
                options.corsHeaders.split(/\s*,\s*/)
                    .forEach(function (h) { self.headers['Access-Control-Allow-Headers'] += ', ' + h; }, this);
            }
            before.push(corser.create(options.corsHeaders) ? {
                requestHeaders: this.headers['Access-Control-Allow-Headers'].split(/\s*,\s*/)
            } : null);
        }

        if (options.robots) {
            before.push((req, res) => {
                if (req.url === '/robots.txt') {
                    res.setHeader('Content-Type', 'text/plain');
                    let robots = options.robots === true
                        ? 'User-agent: *\nDisallow: /'
                        : options.robots.replace(/\\n/, '\n');

                    return res.end(robots);
                }

                res.emit('next');
            });
        }

        before.push(ecstatic({
            root: this.root,
            cache: this.cache,
            showDir: this.showDir,
            showDotfiles: this.showDotfiles,
            autoIndex: this.autoIndex,
            defaultExt: this.ext,
            gzip: this.gzip,
            contentType: this.contentType,
            handleError: typeof options.proxy !== 'string'
        }));

        if (typeof options.proxy === 'string') {
            let proxy = httpProxy.createProxyServer({});
            before.push((req, res) => {
                if (req.firstUrl) {
                    req.url = req.firstUrl;
                }
                try {
                    proxy.web(req, res, {
                        target: options.proxy,
                        changeOrigin: true
                    });
                } catch (e) {
                    console.log(`Error with proxy, ${e}`);
                }
            });
        }

        let serverOptions: any = {
            before: before,
            headers: this.headers,
            onError: (err, req, res) => {
                if (options.logFn) {
                    options.logFn(req, res, err);
                }

                res.end();
            }
        };

        if (options.https) {
            serverOptions.https = options.https;
        }

        this.server = union.createServer(serverOptions);
    }

    listen() {
        this.server.listen(this.server, arguments);
    }

    close() {
        return this.server.close();
    }
}
