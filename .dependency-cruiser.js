/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'error',
            comment: 'Circular dependencies are not allowed',
            from: {},
            to: {
                circular: true
            }
        },
        {
            name: 'no-orphans',
            severity: 'warn',
            comment: 'Orphan modules should be removed or used',
            from: {
                orphan: true,
                pathNot: [
                    '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
                    '\\.d\\.ts$',
                    '(^|/)tsconfig\\.json$',
                    'vitest\\.config\\.ts$',
                    'vitest\\.setup\\.ts$',
                    '__tests__'
                ]
            },
            to: {}
        },
        {
            name: 'no-deprecated-core',
            severity: 'warn',
            comment: 'Deprecated Node.js core modules should not be used',
            from: {},
            to: {
                dependencyTypes: ['core'],
                path: ['^(punycode|domain|constants|sys|_linklist|_stream_wrap)$']
            }
        },
        {
            name: 'not-to-dev-dep',
            severity: 'error',
            comment: 'Production code should not depend on dev dependencies',
            from: {
                path: '^(frontend)',
                pathNot: [
                    '\\.test\\.(ts|tsx)$',
                    '\\.spec\\.(ts|tsx)$',
                    'vitest\\.',
                    '__tests__',
                    '^frontend/test/',
                    '^frontend/next\\.config\\.ts$'
                ]
            },
            to: {
                dependencyTypes: ['npm-dev']
            }
        }
    ],
    options: {
        doNotFollow: {
            path: 'node_modules'
        },
        tsPreCompilationDeps: true,
        tsConfig: {
            fileName: 'tsconfig.json'
        },
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['import', 'require', 'node', 'default']
        },
        reporterOptions: {
            dot: {
                collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)'
            },
            archi: {
                collapsePattern: '^(node_modules|packages|src|lib|app|frontend)/[^/]+',
                theme: {
                    graph: {
                        splines: 'ortho'
                    }
                }
            }
        }
    }
};
