const componentWithMDXScope = require('gatsby-plugin-mdx/component-with-mdx-scope');

const fs = require('fs');

const path = require('path');

const startCase = require('lodash.startcase');

const config = require('./config');

const rawTreeMenu = fs.readFileSync('treeMenu.json');

const treeMenu = JSON.parse(rawTreeMenu);

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions;

  return new Promise((resolve, reject) => {
    resolve(
      graphql(
        `
          {
            allMdx {
              edges {
                node {
                  fields {
                    id
                  }
                  tableOfContents
                  fields {
                    slug
                  }
                  parent {
                    ... on File {
                      id
                      name
                      base
                    }
                  }
                }
              }
            }
          }
        `
      ).then(result => {
        if (result.errors) {
          console.log(result.errors); // eslint-disable-line no-console
          reject(result.errors);
        }

        const pathUrl = (urlFromConfig, slug) => {
          if (urlFromConfig?.route) {
            return `/${urlFromConfig.route}`;
          }
          if (slug) {
            return slug;
          }

          return '/';
        };

        // Create blog posts pages.
        result.data.allMdx.edges.forEach(({ node }) => {
          const findInMenu = treeMenu.menu.find(el => el.file === node.parent.base);

          console.log(findInMenu, node.fields.slug);

          createPage({
            path: pathUrl(findInMenu, node.fields.slug),
            component: path.resolve('./src/templates/docs.js'),
            context: {
              id: node.fields.id,
            },
          });
        });
      })
    );
  });
};

exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      modules: [path.resolve(__dirname, 'src'), 'node_modules'],
      alias: {
        $components: path.resolve(__dirname, 'src/components'),
        buble: '@philpl/buble', // to reduce bundle size
      },
    },
  });
};

exports.onCreateBabelConfig = ({ actions }) => {
  actions.setBabelPlugin({
    name: '@babel/plugin-proposal-export-default-from',
  });
};

exports.onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `Mdx`) {
    const parent = getNode(node.parent);

    const findInMenu = treeMenu.menu.find(el => el.file === parent.base);

    let value = findInMenu?.route || parent.relativePath.replace(parent.ext, '');

    if (value === 'index') {
      value = '';
    }

    if (config.gatsby && config.gatsby.trailingSlash) {
      createNodeField({
        name: `slug`,
        node,
        value: value === '' ? `/` : `/${value}/`,
      });
    } else {
      createNodeField({
        name: `slug`,
        node,
        value: `/${value}`,
      });
    }

    createNodeField({
      name: 'id',
      node,
      value: node.id,
    });

    createNodeField({
      name: 'title',
      node,
      value: node.frontmatter.title || startCase(parent.name),
    });
  }
};
