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
        },
        {
            name: 'invoke-only-in-boundary',
            severity: 'error',
            comment:
                'Tauri IPC (@tauri-apps/api/core) may only be imported from frontend/core or frontend/infrastructure. Higher layers must go through a repository or a core/tauri command-module wrapper.',
            from: {
                path: '^frontend/',
                pathNot: [
                    '^frontend/core/',
                    '^frontend/infrastructure/',
                    '\\.(test|spec)\\.(ts|tsx)$',
                    '__tests__'
                ]
            },
            to: {
                path: '@tauri-apps/api/core'
            }
        },
        {
            name: 'domain-stays-pure',
            severity: 'error',
            comment:
                'domain/ holds interfaces and entities only — it must not depend on infrastructure, features, hooks, store, core, lib, or app.',
            from: {
                path: '^frontend/domain/'
            },
            to: {
                path: '^(frontend/(infrastructure|features|hooks|store|core|lib)|app)/'
            }
        },
        {
            name: 'shared-no-app-logic',
            severity: 'error',
            comment:
                'shared/ is foundational — it must not depend on app-specific layers (domain, infrastructure, features, hooks, store, app).',
            from: {
                path: '^frontend/shared/'
            },
            to: {
                path: '^(frontend/(domain|infrastructure|features|hooks|store)|app)/'
            }
        },
        {
            name: 'lib-no-upward',
            severity: 'warn',
            comment:
                'lib/ should not depend on features/ or infrastructure/. Known follow-ups: save-coordinator → emergency-backup-service, tiptap section-node → editor section-component.',
            from: {
                path: '^frontend/lib/'
            },
            to: {
                path: '^frontend/(features|infrastructure)/'
            }
        },
        {
            name: 'no-cross-feature-deep-import',
            severity: 'warn',
            comment:
                'Import another feature through its public barrel (@/features/<name>), not its internal files (components/hooks/utils/extensions).',
            from: {
                path: '^frontend/features/([^/]+)/'
            },
            to: {
                path: '^frontend/features/([^/]+)/(components|hooks|utils|extensions)/',
                pathNot: [
                    '^frontend/features/$1/',
                    '^frontend/features/shared/'
                ]
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
