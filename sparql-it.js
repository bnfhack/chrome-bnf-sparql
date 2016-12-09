/* global crel, buildWorkGraph, buildAuthorGraph */

let MODAL;


function qs(selector, context) {
    context = context || document;
    return context.querySelector(selector);
}


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


function executeQueryLink(querydef) {
    const a = crel('a', {'class': 'sparql-link',
                         target: '_blank',
                         title: querydef.title,
                         href: '#'},
                   crel('span', {'class': 'fontello'}, '\ue800'));
    a.onclick = (evt) => {showModal(querydef); evt.preventDefault();};
    return a;
}


function sparqlLink(querydef) {
    return crel('span', {'class': 'sparql-it'},
                executeQueryLink(querydef));
}


function authorityMainInfos(pageUri) {
    return {
        title: 'Informations principales',
        query: `
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

}`};
}

function authorDocsQuery(role, authorUri) {
    return {
        title: `Contributions de ${authorUri} avec le rôle ${role}`,
        query:`
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

}`};
}

function workDocsQuery(workUri) {
    return {
        title: `Documents associés à l'œuvre ${workUri}`,
        query: `
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
}`};
}


function relatedAuthorsQuery(authorUri) {
    return {
        title: `Auteurs reliés à ${authorUri}`,
        query: `
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
}`};
}


function musicalGenresQuery(authorUri) {
    return {
        title: `Œuvres musicales de ${authorUri} par genre`,
        query: `
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX mo: <http://musicontology.com/>
PREFIX bnf-onto: <http://data.bnf.fr/ontology/bnf-onto/>


SELECT ?work ?title ?genre ?genrename ?year WHERE {

  ?wconcept foaf:focus ?work;
    skos:prefLabel ?title ;
    mo:genre ?genre.

  <${authorUri}> foaf:focus ?person.

  ?work dcterms:creator ?person.

  ?genre skos:prefLabel ?genrename.

  OPTIONAL {
   ?work bnf-onto:firstYear ?year
  }

} ORDER BY ?genrename ?year
`};
}



function placesQuery() {
    return {
        title: 'Lieux documentés dans databnf',
        query: `
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
`};
}


function studyDocsQuery(authorityUri) {
    return {
        title: `Documents au sujet de ${authorityUri}`,
        query: `
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

}`};
}


function authorWorksQuery(authorUri) {
    return {
        title: `Œuvres de ${authorUri}`,
        query: `
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>

SELECT ?work ?title (COUNT(?manif) as ?count) WHERE {
 ?work dcterms:creator <${authorUri}#foaf:Person>;
    dcterms:title ?title.

  ?manif rdarelationships:workManifested ?work.
}
GROUP BY ?work ?title
ORDER BY DESC(?count)
`};
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


function hackAuthorMusicalGenresSection(authorUri) {
    qsa(`.bloc-contenu a[href="${document.location.href}genres"]`).forEach(a => {
        insertBefore(sparqlLink(musicalGenresQuery(authorUri)), a);
    });

}


function hackAuthorTitle(authorUri) {
    const div = document.querySelector('#allmanifs');
    insertBefore(sparqlLink(authorWorksQuery(authorUri)), div.firstChild);
}


function parentNode(node) {
    if (node === null) {
        return null;
    }
    return node.parentNode;
}


function tooltipize(node, text) {
    if (node === null) {
        return;
    }
    node.setAttribute('data-sparql', text);
    node.classList.add('sparql-tooltip');
}


function infoBoxItem(...texts) {
    for (let item of qsa('.cartouche-infos tr > td')) {
        for (let text of texts) {
            if (item.textContent.startsWith(text)) {
                return item.nextSibling;
            }
        }
    }
    return null;
}

function annotatePerfSubtitles() {
    for (let item of qsa('.h1-auteur ul li')) {
        if (item.textContent.startsWith('Work') || item.textContent.startsWith('Œuvre')) {
            const sublinks = item.querySelectorAll('a');
            tooltipize(sublinks[0], 'foaf:focus → ?p → dcterms:subject');
            if (sublinks.length > 1) {
                tooltipize(sublinks[1], 'foaf:focus → ?p → bnfroles:r70');
            }
        }
        if (item.textContent.startsWith('Metteur')) {
            const sublinks = item.querySelectorAll('a');
            tooltipize(sublinks[0], 'foaf:focus → ?p → bnfroles:r1010');
        }
    }
}


function annotateAuthorPage() {
    tooltipize(qs('h1'), 'skos:prefLabel');
    tooltipize(parentNode(qs('#depict')), 'foaf:focus → ?p → foaf:depiction');
    tooltipize(qs('.cartouche-infos [itemprop=nationality]'), 'foaf:focus → ?p → rdagroup2elements:countryAssociatedWithThePerson');
    tooltipize(infoBoxItem('Field', 'Domaine'), 'foaf:focus → ?p → rdagroup2elements:fieldOfActivityOfThePerson');
    tooltipize(qs('.cartouche-infos [itemprop=description]'), 'skos:note');
    tooltipize(parentNode(qs('.cartouche-infos [itemprop=birthDate]')), 'foaf:focus → ?p → {bio:birth, rdagroup2elements:placeOfBirth}');
    tooltipize(parentNode(qs('.cartouche-infos [itemprop=deathDate]')), 'foaf:focus → ?p → {bio:death, rdagroup2elements:placeOfDeath}');
    tooltipize(infoBoxItem('Sexe', 'Gender'), 'foaf:focus → ?p → foaf:gender');
    tooltipize(infoBoxItem('Langu'), 'foaf:focus → ?p → rdagroup2elements:languageOfThePerson');
    tooltipize(infoBoxItem('Variant', 'Autre'), 'skos:altLabel');
    tooltipize(qs('.cartouche-infos a[href^="http://isni"]'), 'isni:identifierValid');
    qsa('.dtmanifs > h3 > a:first-child').forEach(link => {
        const role = link.href.split('/').pop();
        tooltipize(link, `bnfroles:${role}`);
        tooltipize(link.nextSibling, `?x foaf:focus ?p; ?expr bnfroles:${role} ?p; ?manif rdarelationships:expressionManifested ?expr`);
    });
    qsa('span.liens a[href^="http://ark.bnf"]').forEach(link => {
        const div = link.parentNode.parentNode;
        tooltipize(div, '?expo a bnf-onto:expositionVirtuelle; dcterms:subject ?x');
    });
}


function annotateWorkPage() {
    tooltipize(qs('h1 span[itemprop=name]'), 'skos:prefLabel');
    tooltipize(parentNode(qs('#depict')), 'foaf:focus → ?w → foaf:depiction');
    tooltipize(parentNode(qs('.h1-auteur [itemprop=Creator]')), 'foaf:focus → ?w → dcterms:creator');
    tooltipize(parentNode(qs('.cartouche-infos [itemprop=datePublished]')), 'foaf:focus → ?w → rdagroup1elements:dateOfWork');
    tooltipize(parentNode(qs('.cartouche-infos [itemprop=genre]')), 'foaf:focus → ?w → bnf-onto:subject');
    tooltipize(qs('.cartouche-infos [itemprop=description]'), 'skos:note');
    tooltipize(infoBoxItem('Langu'), 'foaf:focus → ?w → dcterms:language');
    tooltipize(infoBoxItem('Variant', 'Autre'), 'skos:altLabel');
}


function annotatePeriodicalPage() {
    tooltipize(qs('h1'), 'skos:prefLabel');
    tooltipize(infoBoxItem('Tit'), 'skos:altLabel');
    tooltipize(parentNode(qs('.cartouche-infos [itemprop=inLanguage]')), 'foaf:focus → ?w → dcterms:language');
    tooltipize(parentNode(qs('#depict')), 'foaf:focus → ?w → foaf:depiction');
    tooltipize(infoBoxItem('Creation', 'Date de'), 'foaf:focus → ?w → bnf-onto:firstYear');
    tooltipize(infoBoxItem('End of', 'Fin de'), 'foaf:focus → ?w → bnf-onto:lastYear');
    tooltipize(qs('.cartouche-infos [itemprop=issn]'), 'foaf:focus → ?w → bibo:issn');
}


function annotateGeoPage() {
    tooltipize(qs('h1'), 'skos:prefLabel');
    tooltipize(parentNode(qs('#depict')), 'foaf:focus → ?p → foaf:depiction');
    tooltipize(qs('.cartouche-infos [itemprop=geo]'), 'foaf:focus → ?g → geo:{lat,long}');
    tooltipize(infoBoxItem('INSEE', 'Code'), 'foaf:focus → ?g → insee:code_commune');
    tooltipize(infoBoxItem('gentile'), 'foaf:focus → ?g → bnf-onto:habitants');
    tooltipize(infoBoxItem('Feuille', 'IGN'), 'foaf:focus → ?g → bnf-onto:referenceIGN');
    tooltipize(infoBoxItem('Coordonnées L', 'Lambert'), 'foaf:focus → ?g → bnf-onto:coordonneesLambert');
    tooltipize(infoBoxItem('Geographic a', 'Classif'), 'foaf:focus → ?g → bnf-onto:cadreGeographique');
    tooltipize(infoBoxItem('Variant', 'Autre'), 'skos:altLabel');
    tooltipize(infoBoxItem('Related t', 'Voir'), 'skos:closeMatch');
}


function annotateSubjectPage() {
    tooltipize(qs('h1'), 'skos:prefLabel');
    tooltipize(parentNode(qs('#depict')), 'foaf:focus → ?p → foaf:depiction');
    tooltipize(qs('.cartouche-infos [itemprop=description]'), 'skos:note');
    tooltipize(infoBoxItem('Variant', 'Autre'), 'skos:altLabel');
    tooltipize(infoBoxItem('Geographic', 'Notice'), 'skos:closeMatch');
    tooltipize(qs('#broader'), 'skos:broader');
    tooltipize(qs('#narrower'), 'skos:narrower');
    tooltipize(qs('#related'), 'skos:related');
}


function annotatePerformancePage() {
    tooltipize(qs('h1 span[itemprop=name]'), 'foaf:focus → ?p → rdfs:label');
    tooltipize(qs('h1 span.du-subtitle'), 'foaf:focus → ?p → schema:location');
    tooltipize(qs('h1 span.du-subtitle a'), 'foaf:focus → ?p → dcterms:date');
    annotatePerfSubtitles();
}


function hackAuthorPage(pageUri) {
    annotateAuthorPage();
    hackMainInfos(pageUri);
    hackAuthorDocumentSections(pageUri);
    hackRelatedAuthors(pageUri);
    hackStudiesSection(pageUri);
    hackAuthorMusicalGenresSection(pageUri);
    hackAuthorTitle(pageUri);
    buildAuthorGraph(pageUri);
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


function hackGeoDocumentSections(geoUri) {
    qsa('.dtmanifs > h3').forEach(h3 => {
        h3.insertBefore(sparqlLink(studyDocsQuery(geoUri)), h3.firstChild);
    });
}


function hackWorkPage(pageUri) {
    annotateWorkPage();
    hackMainInfos(pageUri);
    hackWorkDocumentSections(pageUri);
    hackStudiesSection(pageUri);
    buildWorkGraph(pageUri);
}


function hackGeoPage(pageUri) {
    annotateGeoPage();
    hackMainInfos(pageUri);
    hackGeoDocumentSections(pageUri);
}


function hackPeriodicalPage(pageUri) {
    annotatePeriodicalPage();
    hackMainInfos(pageUri);
}


function hackSubjectPage(pageUri) {
    annotateSubjectPage();
    hackMainInfos(pageUri);
}


function hackPerformancePage(pageUri) {
    annotatePerformancePage();
    hackMainInfos(pageUri);
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


function hideOnEscape(evt) {
    if (evt.key === 'Escape') {
        hideModal();
        document.body.removeEventListener('keydown', hideOnEscape);
    }
}


function showModal(querydef) {
    const {query, title} = querydef;
    if (!MODAL) {
        MODAL = buildModal();
        document.body.appendChild(MODAL);
    }
    const backdrop = modalBackdrop();
    document.body.appendChild(backdrop);
    backdrop.classList.add('in');
    document.body.addEventListener('keydown', hideOnEscape);
    MODAL.style.display = 'block';
    MODAL.classList.add('fade', 'in');
    MODAL.querySelector('#sparql-modal-title').textContent = title || 'SPARQL-it !';
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

try {
    let permalink = document.querySelector('link[rel=bookmark]'),
        pageUri = (permalink === null) ? null : permalink.href;

    switch(guessPageType()) {
    case 'author':
        hackAuthorPage(pageUri);
        break;
    case 'book':
        hackWorkPage(pageUri);
        break;
    case 'geopoint':
        hackGeoPage(pageUri);
        break;
    case 'periodical':
        hackPeriodicalPage(pageUri);
        break;
    case 'article':
        hackSubjectPage(pageUri);
        break;
    case 'performance':
        hackPerformancePage(pageUri);
        break;
    case 'home':
        if (document.location.pathname === '/') {
            hackHomePage();
        }
        // case 'date'
    }
} catch(err) {
    console.log('failed to activate sparql-it extension because', err);
}
