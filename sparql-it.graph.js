/* global crel, sigma */


function executeQuery(query) {
    return fetch(`http://data.bnf.fr/sparql?query=${encodeURIComponent(query)}&format=${encodeURIComponent('application/sparql-results+json')}`)
        .then(res => res.json())
        .catch(err => console.error('err', err));
}


function parseSparqlResponse(response) {
    return response.results.bindings;
}


function buildGraphModal(title) {
    let closeBtn1, closeBtn2;
    const modalNode = crel(
        'div', {id: 'sparqlit-graphmodal',
                'class': 'modal fade',
                tabindex: -1,
                role: 'dialog',
                'aria-labelledby': 'Sparql-it Modal Dialog'},
        crel('div', {'class': 'modal-dialog', role: 'document'},
             crel('div', {'class': 'modal-content'},
                  crel('div', {'class': 'modal-header'},
                       closeBtn1 = crel('button', {type: 'button',
                                                   'class': 'close',
                                                   'data-dismiss': 'modal',
                                                   'arial-label': 'Close'},
                                        crel('span', {'aria-hidden': true}, 'x')),
                       crel('h4', {'class': 'modal-title',
                                   'id': 'sparql-graphmodal-title'},
                            title)),
                  crel('div', {'class': 'modal-body'},
                       crel('div', {id: 'sparqlit-graphmodal-container',
                                    'class': 'sparqlit-graph'})),
                  crel('div', {'class': 'modal-footer'},
                       closeBtn2 = crel('button', {type: 'button',
                                                   'class': 'btn btn-default',
                                                   'data-dismiss': 'modal'},
                                        'Close')))));
    closeBtn1.onclick = hideGraphModal;
    closeBtn2.onclick = hideGraphModal;
    return modalNode;
}


function modalBackdrop() {
    return crel('div', {'id': 'sparqlit-graphmodal-backdrop',
                        'class': 'modal-backdrop fade'});
}


let GRAPHMODAL;


function showGraphModal() {
    const backdrop = modalBackdrop();
    document.body.appendChild(backdrop);
    backdrop.classList.add('in');
    GRAPHMODAL.style.display = 'block';
    GRAPHMODAL.classList.add('fade', 'in');
}


function hideGraphModal() {
    const backdrop = document.querySelector('#sparqlit-modal-backdrop');
    backdrop.parentNode.removeChild(backdrop);
    GRAPHMODAL.classList.remove('fade', 'in');
    GRAPHMODAL.style.display = 'none';
}


function fetchWorkGraph(workUri) {
    const query = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT DISTINCT ?expr ?formerexpr ?manif ?title ?contributor ?clabel ?role ?rolelabel WHERE {

  ?manif rdarelationships:workManifested <${workUri}#frbr:Work> ;
         rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title.

  ?expr ?role ?contributor.
  ?formerexpr owl:sameAs ?expr.

  ?role skos:prefLabel ?rolelabel.

  ?contributor foaf:name ?clabel.

  OPTIONAL {
    ?formerexpr dcterms:type ?type.
  }

  FILTER(regex(?role, 'http://data.bnf.fr/vocabulary/roles'))
} LIMIT 40
`;
    return executeQuery(query)
        .then(parseSparqlResponse);
}


function fetchContributorsGraph(authorUri) {
    const query = `

PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX bnfroles: <http://data.bnf.fr/vocabulary/roles/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT DISTINCT ?author ?authorname ?role ?rolename ?manif ?title WHERE {

  ?expr dcterms:contributor <${authorUri}#foaf:Person> ;
    ?role ?author.

  ?author a foaf:Person;
       foaf:name ?authorname.

  ?formerexpr owl:sameAs ?expr.
  ?manif rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title.

  ?role skos:prefLabel ?rolename.

  FILTER(regex(?role, 'http://data.bnf.fr/vocabulary/roles'))
} LIMIT 50000
`;
    return executeQuery(query)
        .then(parseSparqlResponse);
}

const colors = [
    '#1f77b4',
    '#ff7f0e',
    '#2ca02c',
    '#d62728',
    '#9467bd',
    '#8c564b',
    '#e377c2',
    '#7f7f7f',
    '#bcbd22',
    '#17becf'
];


function colorScale() {
    let colorId = 0;
    const valueMap = {};
    return (value) => {
        if (valueMap[value] === undefined) {
            valueMap[value] = colors[colorId++];
        }
        return valueMap[value];
    }
}


function Graph() {

    const edgesById = {};
    const nodesById = {};

    return {
        nodes: [],
        edges: [],
        edgesByNode: {},
        addNode(id, params) {
            if (!nodesById[id]) {
                params = Object.assign({id,
                                        x: Math.random(),
                                        y: Math.random(),
                                        size: 1}, params);
                nodesById[id] = params;
                this.nodes.push(params);
            } else {
                nodesById[id].size++;
            }
        },
        addEdge(source, target, props) {
            const id = props.id || `${source}-${target}`;
            if (!edgesById[id]) {
                props = Object.assign({id,
                                       type: 'arrow',
                                       source,
                                       target,
                                       label: id,
                                       size: 1}, props);
                edgesById[id] = props;
                if (this.edgesByNode[source] === undefined) {
                    this.edgesByNode[source] = new Set([id]);
                } else {
                    this.edgesByNode[source].add(id);
                }
                if (this.edgesByNode[target] === undefined) {
                    this.edgesByNode[target] = new Set([id]);
                } else {
                    this.edgesByNode[target].add(id);
                }
                this.edges.push(props);
            } else {
                edgesById[id].size++;
            }

        }
    }
}


function workGraphFromResults(results, pageUri) {
    const conceptid = Number(pageUri.slice(32, 40)),
          workid = `${conceptid}-w`,
          roleColors = colorScale(),
          typeColors = colorScale();
    const graph = Graph();

    function addNode(nodeid, props) {
        props.label = `${props.label} [${props.url}]`;
        graph.addNode(nodeid, props);
    }
    addNode(conceptid, {label: 'Concept',
                        url: pageUri,
                        color: typeColors('Concept'),
                        size: 20});
    addNode(workid, {label: 'Œuvre',
                     url: pageUri + '#frbr:Work',
                     color: typeColors('Work'),
                     size: 20});
    graph.addEdge(conceptid, workid, {id: 'foaf:focus', color: 'red'});

    results.forEach(rowdef => {
        const manifid = rowdef.manif.value.slice(32, 40),
              exprid = `${manifid}-e`,
              formerexprid = `${manifid}-fe`,
              role = Number(rowdef.role.value.split('/').pop().slice(1)),
              rolelabel = rowdef.rolelabel.value,
              title = rowdef.title.value,
              contributor = Number(rowdef.contributor.value.slice(32, 40)),
              clabel = rowdef.clabel.value;

        addNode(contributor, {label: clabel,
                              url: rowdef.contributor.value,
                              color: typeColors('Person'),
                              size: 10})
        addNode(exprid, {label: `${title} (expression)`,
                         url: rowdef.expr.value,
                         color: typeColors('Expression'),
                         size: 5});
        addNode(formerexprid, {label: `${title} (former expression)`,
                               url: rowdef.expr.value,
                               color: typeColors('Expression'),
                               size: 5});
        addNode(manifid, {label: `${title}`,
                          url: rowdef.manif.value,
                          color: typeColors('Manifestation'),
                          size: 5});

        graph.addEdge(formerexprid, exprid, {label: 'owl:sameAs'});
        graph.addEdge(exprid, contributor, {label: `${rolelabel} (bnfroles:r{role})`,
                                            color: roleColors(role),
                                            id: `${exprid}-${role}-${contributor}`});
        graph.addEdge(manifid, formerexprid, {label: 'rdarelationships:expressionManifested'});
        graph.addEdge(manifid, workid, {label: 'rdarelationships:workManifested'});
    });

    return graph;
}


function contributorGraphFromResults(results, pageUri) {
    const conceptid = Number(pageUri.slice(32, 40)),
          dctitle = document.querySelector('head meta[name="DC.title"]').getAttribute('content'),
          roleColors = colorScale();
    const graph = Graph();

    graph.addNode(conceptid, {label: dctitle.split('(')[0].trim(),
                              url: pageUri,
                              color: 'red',
                              size: 1});

    const contributions = {};
    results.forEach(rowdef => {
        const author = Number(rowdef.author.value.slice(32, 40)),
              authorname = rowdef.authorname.value,
              manifid = rowdef.manif.value.slice(32, 40),
              role = Number(rowdef.role.value.split('/').pop().slice(1));
        graph.addNode(author, {label: authorname,
                               url: rowdef.author.value,
                               color: roleColors(role),
                               size: 10})
        if (contributions[manifid] === undefined) {
            contributions[manifid] = new Set();
        }
        contributions[manifid].add(author);
    });

    graph.nodes = graph.nodes.sort((n1, n2) => n2.size - n1.size).slice(0, 30);
    const keptContriubtors = new Set(graph.nodes.map(n => n.id));
    Object.keys(contributions).forEach(manifid => {
        let authors = contributions[manifid];
        authors = Array.from(authors).filter(a => keptContriubtors.has(a));
        for (const author1 of authors) {
            for (const author2 of authors) {
                if (author1 !== author2) {
                    graph.addEdge(author1, author2, {type: 'def'});
                }
            }
        }
    });

    return graph;
}


function initGraph(sigma, graph, customSettings) {
    const settings = Object.assign({
        labelSize: 'proportional',
        labelSizeRatio: 2,
        maxNodeSize: 20,
        maxEdgeSize: 5,
        labelThreshold: 0,
        drawLabels: true,
        drawEdgeLabels: false
    }, customSettings);
    const sigmaGraph = new sigma({
        graph,
        settings,
        renderer: {
            container: 'sparqlit-graphmodal-container',
            type: 'canvas'
        }
    });
    sigmaGraph.bind('clickNode', function(evt) {
        if (evt.data.node && evt.data.node.url) {
            window.open(evt.data.node.url, '_blank');
        }
    });
    sigmaGraph.bind('overNode', function(evt) {
        const edgeIds = graph.edgesByNode[evt.data.node.id];
        if (edgeIds) {
            sigmaGraph.graph.edges().forEach(edge => {
                if (!edgeIds.has(edge.id)) {
                    edge.hidden = true;
                }
            });
            sigmaGraph.refresh();
        }
    });
    sigmaGraph.bind('outNode', function(evt) {
        const edgeIds = graph.edgesByNode[evt.data.node.id];
        if (edgeIds) {
            sigmaGraph.graph.edges().forEach(edge => {edge.hidden = false});
            sigmaGraph.refresh();
        }
    });
    return sigmaGraph;
}


let graphRendered = false;


function startAtlas(graph, timeout, customSettings) {
    const settings = Object.assign({
        worker: true,
        barnesHutOptimize: true,
        edgeWeightInfluence: 4,
        strongGravityMode: true
    }, customSettings);
    graph.startForceAtlas2(settings);
    window.setTimeout(() => {
        graph.stopForceAtlas2()
    }, timeout);
}


function _buildGraph(pageUri, graphPromise, settings) {
    GRAPHMODAL = buildGraphModal(settings.modalTitle);
    document.body.appendChild(GRAPHMODAL);
    graphPromise
        .then(graph => {
            const a = crel('a', {'class': 'sparql-link sparqlit-graph-toggler',
                                 href: '#'},
                           crel('span', {'class': 'fontello'}, '\uf527'));
            a.onclick = (evt) => {
                showGraphModal();
                evt.preventDefault();
                if (!graphRendered) {
                    graphRendered = true;
                    startAtlas(graph, 1500, settings.atlasSettings);
                }
            };
            const h1 = document.querySelector('h1');
            h1.insertBefore(crel('span', {'class': 'sparql-it'}, a),
                            h1.firstChild);
            return graph;
        })
}


function buildWorkGraph(pageUri) {
    const graphPromise = fetchWorkGraph(pageUri)
          .then(results => initGraph(sigma,
                                     workGraphFromResults(results, pageUri),
                                     {drawLabels: false,
                                      drawEdgeLabels: true}));
    _buildGraph(pageUri, graphPromise, {
        modalTitle: 'Extrait du graphe Œuvre / Expr / Manif / Contributeur',
        graphFactory: workGraphFromResults,
        graphSettings: {
            drawLabels: false,
            drawEdgeLabels: true
        },
        atlasSettings: {}
    });
}


function buildAuthorGraph(pageUri) {
    const graphPromise = fetchContributorsGraph(pageUri)
          .then(results => initGraph(sigma,
                                     contributorGraphFromResults(results, pageUri)));
    _buildGraph(pageUri, graphPromise, {
        modalTitle: 'Les 30 auteurs les plus reliés',
        atlasSettings: {}
    });
}
