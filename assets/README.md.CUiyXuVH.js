import{_ as a,o as n,c as e,ae as p}from"./chunks/framework.xPPwUF8v.js";const m=JSON.parse('{"title":"@craft-ng/core Documentation","description":"","frontmatter":{},"headers":[],"relativePath":"README.md","filePath":"README.md"}'),i={name:"README.md"};function t(l,s,c,o,r,d){return n(),e("div",null,[...s[0]||(s[0]=[p(`<h1 id="craft-ng-core-documentation" tabindex="-1">@craft-ng/core Documentation <a class="header-anchor" href="#craft-ng-core-documentation" aria-label="Permalink to &quot;@craft-ng/core Documentation&quot;">​</a></h1><p>This is the VitePress documentation site for @craft-ng/core.</p><h2 id="development" tabindex="-1">Development <a class="header-anchor" href="#development" aria-label="Permalink to &quot;Development&quot;">​</a></h2><p>Start the development server:</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">nx</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> dev</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> docs</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># or</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">npm</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> run</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> docs:dev</span></span></code></pre></div><p>The documentation site will be available at <code>http://localhost:5173</code></p><h2 id="build" tabindex="-1">Build <a class="header-anchor" href="#build" aria-label="Permalink to &quot;Build&quot;">​</a></h2><p>Build the documentation site:</p><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">nx</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> build</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> docs</span></span></code></pre></div><p>The built site will be in <code>apps/docs/.vitepress/dist/</code></p><h2 id="structure" tabindex="-1">Structure <a class="header-anchor" href="#structure" aria-label="Permalink to &quot;Structure&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>apps/docs/</span></span>
<span class="line"><span>├── .vitepress/</span></span>
<span class="line"><span>│   ├── config.mts          # VitePress configuration</span></span>
<span class="line"><span>│   └── theme/              # Custom theme</span></span>
<span class="line"><span>├── index.md                # Homepage</span></span>
<span class="line"><span>├── get-started.md          # Installation guide</span></span>
<span class="line"><span>├── introduction.md         # Core concepts</span></span>
<span class="line"><span>├── primitives/             # Primitive APIs</span></span>
<span class="line"><span>│   ├── state.md</span></span>
<span class="line"><span>│   ├── async-process.md</span></span>
<span class="line"><span>│   ├── query-param.md</span></span>
<span class="line"><span>│   ├── query.md</span></span>
<span class="line"><span>│   └── mutation.md</span></span>
<span class="line"><span>├── insertions/             # Insertion features</span></span>
<span class="line"><span>│   ├── insert-select.md</span></span>
<span class="line"><span>│   ├── insert-local-storage.md</span></span>
<span class="line"><span>│   └── insert-react-on-mutation.md</span></span>
<span class="line"><span>├── store/                  # Store patterns</span></span>
<span class="line"><span>│   ├── craft.md</span></span>
<span class="line"><span>│   ├── craft-state.md</span></span>
<span class="line"><span>│   ├── craft-sources.md</span></span>
<span class="line"><span>│   ├── craft-inputs.md</span></span>
<span class="line"><span>│   ├── craft-computed.md</span></span>
<span class="line"><span>│   ├── craft-async-processed.md</span></span>
<span class="line"><span>│   ├── craft-query-param.md</span></span>
<span class="line"><span>│   ├── craft-query-params.md</span></span>
<span class="line"><span>│   ├── craft-query.md</span></span>
<span class="line"><span>│   ├── craft-mutation.md</span></span>
<span class="line"><span>│   ├── craft-set-all-queries-params-standalone.md</span></span>
<span class="line"><span>│   └── craft-inject.md</span></span>
<span class="line"><span>├── utils/                  # Utility functions</span></span>
<span class="line"><span>│   ├── source.md</span></span>
<span class="line"><span>│   ├── to-source.md</span></span>
<span class="line"><span>│   ├── stacked-source.md</span></span>
<span class="line"><span>│   ├── inject-service.md</span></span>
<span class="line"><span>│   └── source-from-event.md</span></span>
<span class="line"><span>├── examples.md             # Examples</span></span>
<span class="line"><span>└── press-kit.md            # Press kit &amp; resources</span></span></code></pre></div><h2 id="adding-content" tabindex="-1">Adding Content <a class="header-anchor" href="#adding-content" aria-label="Permalink to &quot;Adding Content&quot;">​</a></h2><ol><li>Create or edit markdown files in the appropriate directory</li><li>The sidebar is configured in <code>.vitepress/config.mts</code></li><li>Add links to new pages in the sidebar configuration</li><li>Each page should include the import statement for the feature it documents</li></ol><h2 id="assets" tabindex="-1">Assets <a class="header-anchor" href="#assets" aria-label="Permalink to &quot;Assets&quot;">​</a></h2><p>Add images, logos, and other assets to <code>public/assets/</code></p><ul><li><code>ng-craft-logo.png</code> - Main logo</li><li><code>favicon.png</code> - Site favicon</li></ul>`,17)])])}const u=a(i,[["render",t]]);export{m as __pageData,u as default};
