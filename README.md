## Triathlon Race Prediction App ##

User enters their name, age, paces in the swim, bike & run, selects an experience level and race distance. After clicking the submit button, the LWC sends the information to an Apex class to perform validation, conversion and calculation. Within the Apex class, there is a SOQL query to pull the race distances from a custom race object. Once everything has checked out, the Apex sends the total time back to the LWC and stores the Athlete's info in one custom object and the race prediction in another custom object.


RacePredictor_Objects.txt has all of Objects and fields listed
RacePredictor_Classes.txt has the main Apex class and Apex test class


## Tech Stack ##
- Salesforce LWC (Lightning Web Component)
- Apex (logic, validation, SOQL, DML)
- Custom Objects (Athlete__c, Race__c, Race_Prediction__c)


## Key Design Decisions ##
- LWC chosen over Screen Flow to demonstrate developer-level skills
- Two layer validation: LWC handles basic format checks, Apex handles validation
- Time math performed in seconds to avoid floating point issues, and then re-converted to HH:MM:SS for display
- Race distances stored in a custom Race object and retrieved via SOQL rather than hardcoded
- Apex helper methods kept small and single-purpose for readability and testability
- 100% Apex test coverage



MainScreenShot.png shows the Lightning Web Component first loaded
CodeCoverage.png shows the Apex test coverage
