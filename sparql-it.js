/* global crel */

let MODAL;

function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
}


function insertBefore(newNode, target) {
    target.parentElement.insertBefore(newNode, target);
}


function buildModal() {
    let closeBtn1, closeBtn2;
    const modalNode = crel(
        'div', {id: 'sparqlit-modal',
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
                                   'id': 'sparql-modal-title'},
                            'SPARQL-it !')),
                  crel('div', {'class': 'modal-body'},
                       crel('pre', {id: 'sparqlit-modal-pre'})),
                  crel('div', {'class': 'modal-footer'},
                       crel('a', {'class': 'btn btn-info',
                                  id: 'sparqlit-modal-exec',
                                  href: '#',
                                  target: '_blank'}, 'Execute'),
                       crel('a', {'class': 'btn btn-info',
                                  id: 'sparqlit-modal-edit',
                                  href: 'http://data.bnf.fr/sparql',
                                  target: '_blank'}, 'Edit'),
                       crel('a', {'class': 'btn btn-info',
                                  id: 'sparqlit-modal-dl',
                                  href: '#',
                                  target: '_blank'}, 'Download (JSON)'),
                       closeBtn2 = crel('button', {type: 'button',
                                                   'class': 'btn btn-default',
                                                   'data-dismiss': 'modal'},
                                        'Close')))));
    closeBtn1.onclick = hideModal;
    closeBtn2.onclick = hideModal;
    return modalNode;
}


function modalBackdrop() {
    return crel('div', {'id': 'sparqlit-modal-backdrop',
                        'class': 'modal-backdrop fade'});
}


function sparqlUrl(query, mimetype) {
    return `http://data.bnf.fr/sparql?query=${encodeURIComponent(query)}&format=${encodeURIComponent(mimetype || 'text/html')}`;
}


function executeQueryLink(query) {
    const a = crel('a', {'class': 'sparql-link',
                         target: '_blank',
                         title: 'Execute Query',
                         href: '#'},
                   crel('i', {'class': 'glyphicon glyphicon-search'}),
                   'SPARQL-it');
    a.onclick = (evt) => {showModal(query); evt.preventDefault();};
    return a;
}


function sparqlLink(query) {
    return crel('span', {'class': 'sparql-it'},
                executeQueryLink(query));
}


function authorityMainInfos(pageUri) {
    return `
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?uri ?predicate ?object WHERE {

  {
    BIND (<${pageUri}> AS ?uri)
    ?uri ?predicate ?object.
  }

  UNION

  {
    <${pageUri}> foaf:focus ?uri.
    ?uri ?predicate ?object.
  }

}`;
}

function authorDocsQuery(role, authorUri) {
    return `
PREFIX bnfroles: <http://data.bnf.fr/vocabulary/roles/>
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
PREFIX dcterms: <http://purl.org/dc/terms/>


SELECT DISTINCT ?manif ?work ?title ?date ?type ?gallica WHERE {

  ?expr bnfroles:${role} <${authorUri}#foaf:Person>.
  ?formerexpr owl:sameAs ?expr.
  ?manif rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title
  OPTIONAL {
    ?manif rdarelationships:workManifested ?work.
  }

  OPTIONAL {
    ?manif rdarelationships:electronicReproduction ?gallica.
  }

  OPTIONAL {
    ?manif dcterms:date ?date.
  }

  OPTIONAL {
    ?formerexpr dcterms:type ?type.
  }

}`;
}

function workDocsQuery(workUri) {
    return `
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
PREFIX dcterms: <http://purl.org/dc/terms/>


SELECT DISTINCT ?manif ?title ?date ?type ?gallica WHERE {

  ?manif rdarelationships:workManifested <${workUri}#frbr:Work> ;
         rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title

  OPTIONAL {
    ?manif rdarelationships:electronicReproduction ?gallica.
  }

  OPTIONAL {
    ?manif dcterms:date ?date.
  }

  OPTIONAL {
    ?formerexpr dcterms:type ?type.
  }
}`;
}


function relatedAuthorsQuery(authorUri) {
    return `
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX bnfroles: <http://data.bnf.fr/vocabulary/roles/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?role1 ?manif ?title ?role2 ?author2 ?author2name WHERE {
  ?expr dcterms:contributor <${authorUri}#foaf:Person> ;
        ?role1 <${authorUri}#foaf:Person> ;
        ?role2 ?author2.

  ?author2 a foaf:Person;
       foaf:name ?author2name.

  ?formerexpr owl:sameAs ?expr.
  ?manif rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title.

  FILTER(regex(?role1, 'http://data.bnf.fr/vocabulary/roles'))
  FILTER(regex(?role2, 'http://data.bnf.fr/vocabulary/roles'))
  FILTER(?author2 != <${authorUri}#foaf:Person>)
}`;
}


function placesQuery() {
    return `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>

SELECT ?geo ?label ?lat ?lng ?geonames WHERE {

  ?geoconcept skos:closeMatch ?rameau ;
    skos:prefLabel ?label ;
    foaf:focus ?geo.

  OPTIONAL {
    ?geoconcept skos:exactMatch ?geonames.
    FILTER(regex(?geonames, 'http://sws.geonames.org/'))
  }

  ?geo geo:lat ?lat ;
       geo:long ?lng.

  ?rameau a skos:Concept.
}
`;
}


function studyDocsQuery(authorityUri) {
    return `
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
PREFIX dcterms: <http://purl.org/dc/terms/>


SELECT DISTINCT ?manif ?work ?title ?date ?type ?gallica WHERE {

  ?formerexpr owl:sameAs ?expr.

  ?manif dcterms:subject <${authorityUri}> ;
         rdarelationships:expressionManifested ?formerexpr ;
         dcterms:title ?title.

  OPTIONAL {
    ?manif rdarelationships:workManifested ?work.
  }

  OPTIONAL {
    ?manif rdarelationships:electronicReproduction ?gallica.
  }

  OPTIONAL {
    ?manif dcterms:date ?date.
  }

  OPTIONAL {
    ?formerexpr dcterms:type ?type.
  }

}`;
}


function authorWorksQuery(authorUri) {
    return `
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>

SELECT ?work ?title (COUNT(?manif) as ?count) WHERE {
 ?work dcterms:creator <${authorUri}#foaf:Person>;
    dcterms:title ?title.

  ?manif rdarelationships:workManifested ?work.
}
GROUP BY ?work ?title
ORDER BY DESC(?count)
`;
}


function storeQuery(query) {
    if (window.localStorage !== undefined) {
        localStorage.setItem('queryVal_main', JSON.stringify({val: query}));
    }
}


function hackMainInfos(pageUri) {
    const h1 = document.querySelector('h1');
    insertBefore(sparqlLink(authorityMainInfos(pageUri)), h1.firstChild);
}


function hackAuthorDocumentSections(authorUri) {
    qsa('.dtmanifs > h3 > a:first-child').forEach(link => {
        const role = link.href.split('/').pop();
        const h3 = link.parentElement;
        h3.insertBefore(sparqlLink(authorDocsQuery(role, authorUri)), link);
    });
}


function hackRelatedAuthors(authorUri) {
    qsa(`.bloc-contenu a[href="http://data.bnf.fr/linked-authors/${authorUri.slice(32, 40)}"]`).forEach(a => {
        insertBefore(sparqlLink(relatedAuthorsQuery(authorUri)), a);
    });
}


function hackAuthorTitle(authorUri) {
    const div = document.querySelector('#allmanifs');
    insertBefore(sparqlLink(authorWorksQuery(authorUri)), div.firstChild);
}


function hackAuthorPage(pageUri) {
    hackMainInfos(pageUri);
    hackAuthorDocumentSections(pageUri);
    hackRelatedAuthors(pageUri);
    hackStudiesSection(pageUri);
    hackAuthorTitle(pageUri);
}


function hackWorkDocumentSections(workUri) {
    qsa('.dtmanifs > h3').forEach(h3 => {
        h3.insertBefore(sparqlLink(workDocsQuery(workUri)), h3.firstChild);
    });
}


function hackStudiesSection(pageUri) {
    qsa('.bloc-contenu a[href$=studies').forEach(link => {
        insertBefore(sparqlLink(studyDocsQuery(pageUri)), link);
    });
}


function hackWorkPage(pageUri) {
    hackMainInfos(pageUri);
    hackWorkDocumentSections(pageUri);
    hackStudiesSection(pageUri);
}


function hackHomePage() {
    const mapBlock = document.querySelector('#map-geo');
    insertBefore(sparqlLink(placesQuery()), mapBlock);
}


function guessPageType() {
    const ogtype = document.querySelector('meta[property="og:type"]');
    if (ogtype && ogtype.content) {
        return ogtype.content;
    }
    const path = document.location.pathname;
    if (path === '/') {
        return 'home';
    } else if (path.startsWith('/date')) {
        return 'date';
    } else if (path.startsWith('/3') || path.startsWith('/4')) {
        const divtype = document.querySelector('#fullpage div[itemtype]'),
              itemtype = divtype ? divtype.getAttribute('itemtype') : null;
        if (itemtype === 'http://schema.org/Periodical') {
            return 'periodical';
        } else if (itemtype === 'http://schema.org/TheaterEvent') {
            return 'performance';
        }
    }
    return null;
}


function showModal(query) {
    if (!MODAL) {
        MODAL = buildModal();
        document.body.appendChild(MODAL);
    }
    const backdrop = modalBackdrop();
    document.body.appendChild(backdrop);
    backdrop.classList.add('in');
    MODAL.style.display = 'block';
    MODAL.classList.add('fade', 'in');
    MODAL.querySelector('#sparqlit-modal-pre').textContent = query;
    MODAL.querySelector('#sparqlit-modal-exec').href = sparqlUrl(query);
    MODAL.querySelector('#sparqlit-modal-dl').href = sparqlUrl(query, 'application/sparql-results+json');
    MODAL.querySelector('#sparqlit-modal-edit').onclick = () => storeQuery(query);
}


function hideModal() {
    const backdrop = document.querySelector('#sparqlit-modal-backdrop');
    backdrop.parentNode.removeChild(backdrop);
    MODAL.classList.remove('fade', 'in');
    MODAL.style.display = 'none';
}


let permalink = document.querySelector('link[rel=bookmark]'),
    pageUri = (permalink === null) ? null : permalink.href;

switch(guessPageType()) {
case 'author':
    hackAuthorPage(pageUri);
    break;
case 'book':
    hackWorkPage(pageUri);
    break;
case 'home':
    if (document.location.pathname === '/') {
        hackHomePage();
    }
// case 'geopoint'
// case 'article'
// case 'date'
// case 'periodical'
// case 'performace'
}
