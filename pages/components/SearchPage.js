import { useEffect, useState, useCallback, Fragment } from 'react';
import { getByType, matchItemOrArray, jstr } from '../../lib/JsonLd';

function SearchPage(props) {
  let data = props.data;
  let type = props.type;
  let styles = props.styles;
  let setType = props.setType;
  let processDescription = props.processDescription;
  let selectObject = props.selectObject;

  const [typeSearchResults, setTypeSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if(data && type) {
      let _typeSearchResults = getByType(type, data);

      if(searchQuery) {
        _typeSearchResults = _typeSearchResults.filter(x => {
          let idMatch = matchItemOrArray(x['@id'], val => val.toLowerCase().includes(searchQuery))

          let descMatch = matchItemOrArray(x['rdfs:comment'], val => {
            if(typeof val === 'string') {
              return val.toLowerCase().includes(searchQuery)
            }
          });
          return idMatch || descMatch;
        })
      }

      setTypeSearchResults(_typeSearchResults);
    }
  }, [data, type, searchQuery]);

  function handleTypeFormSubmit(e) {
    setType(enteredType);
    e.preventDefault();
  }

  function getSearchForm() {
    return <form onSubmit={handleTypeFormSubmit}>
      <input className={styles.csnObjectTypeSearch} type="text" value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value.toLowerCase())} 
             placeholder="Search schema.org..." />
    </form>;
  }
 
  function getTypeSearchPanel() {
    let maxRecords = 100;
    let numDisplayed = 0;

    let typeSearchResultsUI = [];
    for(let val of typeSearchResults) {
      let id = val['@id'];
      let name = id.split(':')[1];
      let comment = val['rdfs:comment'];
      if(typeof comment === 'object') {
        comment = jstr(comment);
      }
      typeSearchResultsUI.push(
        <div className={styles.searchResult} key={name}>
          <div onClick={e => selectObject(name)} className={styles.searchResultName}>
            <div className={styles.csnTextEllipsis}> 
              {name}
            </div>
          </div>
          <div className={styles.searchResultDesc}>
            {processDescription(comment)}
          </div>
        </div>
      )

      if(++numDisplayed >= maxRecords) {
        break;
      }
    }

    if(numDisplayed === maxRecords) {
      typeSearchResultsUI.push(
        <div className={styles.maxRecordsMessage}>
          Maximum of {maxRecords} displayed
        </div>
      )
    }

    return <div className={styles.sorgTypeSearchPanel}>
      <div>
        { getSearchForm() }
      </div>
      <div className="sorgTypeSearchResults">
        { typeSearchResultsUI }
      </div>
    </div>
  }
  
  function getDataPanel() {
    return <div className="sorgDataPanel">
      { !data && 'Data loading...' } 
    </div>;
  }

  function getSearchPage() {
    let searchPage = <div className="csnSearchPage">
      <div>
        {getDataPanel()}
      </div>
      <div>
        {getTypeSearchPanel()}
      </div>
    </div>;

    return searchPage;
  }

  return getSearchPage();
}

export default SearchPage;