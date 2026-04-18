## Triathlon Race Prediction App ##

User enters their name, age, paces in the swim, bike & run, selects an experience level and race distance. After clicking the submit button, the LWC sends the information to an Apex class to perform validation, conversion and calculation. Within the Apex class, there is a SOQL query to pull the race distances from a custom race object. Once everything has checked out, the Apex sends the total time back to the LWC and stores the Athlete's info in one custom object and the race prediction in another custom object.


RacePredictor_Objects.txt has all of Objects and fields listed
RacePredictor_Classes.txt has the main Apex class and Apex test class

MainScreenShot.png shows the Lightning Web Component first loaded

