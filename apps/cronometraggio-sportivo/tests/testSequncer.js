const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  /**
   * Ordina i test per eseguire prima quelli più veloci
   * e gestire le dipendenze tra test di integrazione
   */
  sort(tests) {
    // Definisce l'ordine di priorità dei test
    const testOrder = [
      'setup.test.js',           // Test di setup per primi
      'database.test.js',        // Test database
      'cronometraggi.test.js',   // Test cronometraggi
      'tempi.test.js',           // Test tempi  
      'export.test.js',          // Test export
      'api.test.js',             // Test API generiche
      'integration.test.js'      // Test integrazione per ultimi
    ];

    return tests.sort((testA, testB) => {
      const aName = testA.path.split('/').pop();
      const bName = testB.path.split('/').pop();
      
      const aIndex = testOrder.indexOf(aName);
      const bIndex = testOrder.indexOf(bName);
      
      // Se entrambi i test sono nell'ordine definito
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Se solo uno è nell'ordine definito, ha priorità
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // Altrimenti ordina alfabeticamente
      return aName.localeCompare(bName);
    });
  }
}

module.exports = CustomSequencer;
