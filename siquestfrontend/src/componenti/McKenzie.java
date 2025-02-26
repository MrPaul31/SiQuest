// Iniezione della dipendenza per il client SOAP che effettua la comunicazione con il servizio esterno
@Autowired
ClientWsdl client;

@CrossOrigin  // Abilita le richieste Cross-Origin, consentendo chiamate da domini diversi (necessario per applicazioni REST che interagiscono con questo endpoint)
@PostMapping("/{functionName}")  // Mappa le richieste POST sull'endpoint dinamico; {functionName} è una variabile di percorso che indica la funzione SOAP da invocare
public Response execute(
        // Header opzionale che rappresenta l'ID della sessione utente
        @RequestHeader(value = "idSessione", required = false) String idSessione,
        
        // Header opzionale contenente l'identificativo dell'operatore che effettua la richiesta
        @RequestHeader(value = "operatore", required = false) String operatore,
        
        // Header opzionale che specifica il livello di abilitazione dell'utente/operatore
        @RequestHeader(value = "livelloAbilitazione", required = false) String livelloAbilitazione,
        
        // Corpo opzionale della richiesta REST, mappato su un DTO che contiene i dati da inviare al servizio SOAP
        @RequestBody(required = false) BodyRequestDto bodyRequest,
        
        // Parametro di query opzionale per passare ulteriori dati relativi all'operatore
        @RequestParam(value = "datiOperatore", required = false) String datiOperatore,
        
        // Variabile di percorso che indica il nome della funzione SOAP che si desidera eseguire
        @PathVariable String functionName) throws UnknownHostException {
    
    // Chiamata al metodo executeRequest del client SOAP, che agisce come wrapper convertitore da REST a SOAP.
    // Passa tutti i parametri raccolti: il nome della funzione, i dati del corpo della richiesta e i vari header/parametri.
    return client.executeRequest(functionName, bodyRequest, datiOperatore, idSessione, operatore, livelloAbilitazione);
}