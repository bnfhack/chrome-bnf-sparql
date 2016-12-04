/* global crel, sigma */


function executeQuery(query) {
    return fetch(`http://data.bnf.fr/sparql?query=${encodeURIComponent(query)}&format=${encodeURIComponent('application/sparql-results+json')}`)
        .then(res => res.json())
        .catch(err => console.error('err', err));
}


function parseSparqlResponse(response) {
    return response.results.bindings;
}


function buildGraphModal() {
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
                            'SPARQL-it Extrait du graphe Œuvre / Expr / Manif / Contributeur')),
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


const GRAPHMODAL = buildGraphModal();
document.body.appendChild(GRAPHMODAL);


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


function graphFromResults(results, pageUri) {
    const conceptid = Number(pageUri.slice(32, 40)),
          workid = `${conceptid}-w`,
          roleColors = colorScale(),
          typeColors = colorScale();
    const graph = {nodes: [], edges: []};
    const edgesById = {};
    const processed = {};

    function addNode(id, params) {
        if (!processed[id]) {
            processed[id] = true;
            params.label = `${params.label} [${params.url}]`;
            graph.nodes.push(Object.assign({id,
                                            x: Math.random(),
                                            y: Math.random(),
                                            size: 1}, params));
        }
    }

    function addEdge(source, target, props) {
        const id = props.id || `${source}-${target}`;
        if (!edgesById[id]) {
            props = Object.assign({id,
                                   type: 'arrow',
                                   source,
                                   target,
                                   label: id,
                                   size: 1}, props);
            edgesById[id] = props;
            graph.edges.push(props);
        }
    }

    addNode(conceptid, {label: 'Concept',
                        url: pageUri,
                        color: typeColors('Concept'),
                        size: 20});
    addNode(workid, {label: 'Œuvre',
                     url: pageUri + '#frbr:Work',
                     color: typeColors('Work'),
                     size: 20});
    addEdge(conceptid, workid, {id: 'foaf:focus', color: 'red'});

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

        addEdge(formerexprid, exprid, {label: 'owl:sameAs'});
        addEdge(exprid, contributor, {label: `${rolelabel} (bnfroles:r{role})`,
                                      color: roleColors(role),
                                      id: `${exprid}-${role}-${contributor}`});
        addEdge(manifid, formerexprid, {label: 'rdarelationships:expressionManifested'});
        addEdge(manifid, workid, {label: 'rdarelationships:workManifested'});
    });

    return graph;
}


function initGraph(sigma, results, pageUri) {
    const graph = graphFromResults(results, pageUri);
    const sigmaGraph = new sigma({
        graph: graph,
        renderer: {
            container: 'sparqlit-graphmodal-container',
            type: 'canvas'
        },
        settings: {
            edgeLabelSize: 'proportional'
        }
    });
    sigmaGraph.bind('clickNode', function(evt) {
        if (evt.data.node && evt.data.node.url) {
            window.open(evt.data.node.url, '_blank');
        }
    });
    return sigmaGraph;
}


let graphRendered = false;

function buildGraph(pageUri) {
    fetchWorkGraph(pageUri)
        .then(results => initGraph(sigma, results, pageUri))
        .then(graph => {
            const a = crel('a', {'class': 'sparql-link sparqlit-graph-toggler',
                                 href: '#'}, '[Graphe (visu)]');
            a.onclick = (evt) => {
                showGraphModal();
                evt.preventDefault();
                if (!graphRendered) {
                    graphRendered = true;
                    graph.startForceAtlas2({worker: true, barnesHutOptimize: false});
                    window.setTimeout(() => {
                        graph.stopForceAtlas2()
                    }, 2500);
                }
            };
            const h1 = document.querySelector('h1');
            h1.insertBefore(a, h1.firstChild);
            return graph;
        })
}
