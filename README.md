## Triathlon Race Prediction App ##

User enters their name, age, paces in the swim, bike & run, selects an experience level and race distance. After clicking the submit button, the LWC sends the information to an Apex class to perform validation, conversion and calculation. Once everything has checked out, the Apex sends the total time back to the LWC and stores the Athlete's info in one custom object and the race prediction in another custom object.

#############
## Objects ##
#############

Athlete__c
Fields & Relationships
Age	                Age__c              	Number(3, 0)
Athlete Name    	Name	                Text(80)
Bike Speed	        Bike_Speed__c	        Number(3, 0)
Experience Level	Experience_Level__c	    Picklist
Owner	            OwnerId     	        Lookup(User,Group)
Run Pace    	    Run_Pace__c             Text(100)
Swim Pace	        Swim_Pace__c	        Text(100)

Race_Prediction__c
Fields & Relationships
Athlete             	Athlete__c              	Lookup(Athlete)
Predicted Bike Time 	Predicted_Bike_Time__c  	Number(8, 2)
Predicted Run Time  	Predicted_Run_Time__c   	Number(8, 2)
Predicted Swim Time 	Predicted_Swim_Time__c  	Number(8, 2)
Race                	Race__c                 	Lookup(Race)
Race Prediction Name   	Name                    	Text(80)
Total Race Time     	Total_Race_Time__c      	Text(10)
Transition Time     	Transition_Time__c      	Number(6, 0)




##################
## Apex Classes ##
##################

---------------------
RaceCalculator.apxc -
---------------------
public class RaceCalculator {
    @AuraEnabled public static String CalculateRace(String AthleteName, Integer AthleteAge, String swimPace, Integer bikeSpeed, String runPace, String xpLevel, String raceDist) {
        String validateErrors = '';
        List<String> listCheck = new List<String>();
        //send inputted paces to validate
        listCheck = validateInputs(swimPace, bikeSpeed, runPace);
        //if error string is populated, throw error and end, else continue
        if (!listCheck.isEmpty()) {
            throw new AuraHandledException(String.join(listCheck, ' | '));
        } else {
	    	String TotalRaceTime = '';
            //continue on checks
            Decimal TransTime = TransitionCalc(xpLevel, raceDist);
            Decimal TotalSwim = SwimCalc(swimPace, raceDist);
            Decimal TotalBike = BikeCalc(bikeSpeed, raceDist);
            Decimal TotalRun = RunCalc(runPace, raceDist);
            
            //add up the individual legs and transition
            Decimal TotalRaceSec = AddLegs(TransTime, TotalSwim, TotalBike, TotalRun);
            //convert the total seconds to HH:MM:SS
            TotalRaceTime = Seconds2Time(TotalRaceSec);
            
            //create the athlete object save for DML
            System.debug('About to enter the new Athlete');
            Athlete__c newAthlete = new Athlete__c();
            newAthlete.Name = AthleteName;
            newAthlete.Age__c = AthleteAge;
            newAthlete.Swim_Pace__c = swimPace;
            newAthlete.Bike_Speed__c = bikeSpeed;
            newAthlete.Run_Pace__c = runPace;
            newAthlete.Experience_Level__c = xpLevel;
            insert newAthlete;
            System.debug('Athlete inserted: ' + newAthlete.Id);
            //insert the race prediction for DML
            Race_Prediction__C newPrediction = new Race_Prediction__C();
            newPrediction.Athlete__c = newAthlete.Id;
            newPrediction.Name = AthleteName + ' - ' + raceDist + ' - ' + TotalRaceTime;
            newPrediction.Predicted_Swim_Time__c = TotalSwim;
            newPrediction.Predicted_Bike_Time__c = TotalBike;
            newPrediction.Predicted_Run_Time__c = TotalRun;
            newPrediction.Transition_Time__c = TransTime;
            newPrediction.Total_Race_Time__c = TotalRaceTime;
            insert newPrediction;
            //return to the predicted time to the lwc
            return TotalRaceTime;
        }
        
    }
    
    
    //method to validate paces
    public static List<String> validateInputs(String swimCheck, Integer bikeCheck, String runCheck) {
        List<String> errorList = new List<String>();
        errorList.clear();
        String colon = ':';
        Integer result = 0;
        
        //bike checks
        if (bikeCheck == 0) {
            errorList.add('Bike speed cannot be zero');
        } else if (bikeCheck >= 40) {
            errorList.add('Too fast - Bike cannot be a car');
        }
        //swim checks
        result = swimCheck.IndexOf(colon);
        if (result < 0 ) {
            errorList.add('Incorrectly formatted swim pace');
        } else if (swimCheck.length() > 4) {
            errorList.add('Swim pace format too long');
        } else {
            //break swim into minutes and seconds
            Integer SwimMin = Integer.valueOf(swimCheck.subStringBefore(colon));
            Integer SwimSec = Integer.valueOf(swimCheck.subStringAfter(colon));
            //check values of mins and secs
            if (SwimSec > 59) {
                errorList.add('Incorrectly entered swim time [seconds]');
            }
            if (SwimMin > 4 || SwimMin < 1) {
                errorList.add('Incorrectly entered swim time [minutes]');
            }
            if (SwimMin == 0 && SwimSec == 0) {
                errorList.add('Swim pace cannot be zero');
            }
        }
        
        //run checks
        result = runCheck.IndexOf(colon);
        if (result < 0 ) {
            errorList.add('Incorrectly formatted run pace');
        } else if (runCheck.length() > 5) {
            errorList.add('Run pace format too long');
        } else {
            //break run into minutes and seconds
            Integer RunMin = Integer.valueOf(runCheck.subStringBefore(colon));
            Integer RunSec = Integer.valueOf(runCheck.subStringAfter(colon));
            //check values of mins and secs
            if (RunSec > 59) {
                errorList.add('Incorrectly entered run time [seconds]');
            }
            if (RunMin == 0 && RunSec == 0) {
                errorList.add('Run pace cannot be zero');
            }
            if (RunMin < 3) {
                errorList.add('Incorrectly entered run pace [minutes]');
            }
        }
        
        return errorList;
    }
    
    
    //method to experience level multiplier
    public static Decimal TransitionCalc(String xpLevel, String RaceDist) {
        Integer xpMulti = 0;
        Integer TransMins = 0;
        switch on xpLevel{
            when 'Pro' {
                xpMulti = 1;
            }
            when 'Competitive' {
                xpMulti = 2;
            }
            when 'Experienced' {
                xpMulti = 4;
            }
            when else {
                xpMulti = 6;
            }
        }
        switch on RaceDist {
            //for full iron tri
            when 'full' {
                TransMins = 4 * xpMulti;
            }
            //for half iron tri
            when 'half' {
                TransMins = 3 * xpMulti;
            }
            //for olympic dist tri
            when 'oly' {
                TransMins = 2 * xpMulti;
            }
            //for general sprint tri
            when else {
                TransMins = 1 * xpMulti;
            }
        }
		Decimal TransSec = TransMins * 60;
        return TransSec;
    }

    
    //method to calculate the swim leg
    public static Decimal SwimCalc(String swimPace, String raceDist) {
        Decimal SwimDist = 0;
        switch on raceDist {
            when 'full' {
                SwimDist = 3860;
            }
            when 'half' {
                SwimDist = 1930;
            }
            when 'oly' {
                SwimDist = 1500;
            }
            when 'sprint' {
                SwimDist = 400;
            }
        }
        String colon = ':';
        Integer SwimMin = Integer.valueOf(swimPace.subStringBefore(colon));
        Integer SwimSec = Integer.valueOf(swimPace.subStringAfter(colon));
        //calculate the swim pace in seconds
        Integer swimTimeSec = (SwimMin * 60) + SwimSec;
        Decimal swimTime = (SwimDist / 100) * swimTimeSec;
        //send the time back
        return swimTime;
    }
    //method to calculate the bike leg
    public static Decimal BikeCalc(Integer bikeSpeed, String raceDist) {
        Decimal BikeDist = 0;
        switch on raceDist {
            when 'full' {
                BikeDist = 112;
            }
            when 'half' {
                BikeDist = 56;
            }
            when 'oly' {
                BikeDist = 28;
            }
            when 'sprint' {
                BikeDist = 12;
            }
        }
        Decimal BikeTime = (BikeDist / bikeSpeed) * 3600;
        return BikeTime;
    }
    //method to calculate the run leg
    public static Decimal RunCalc(String runPace, String raceDist) {
        Decimal RunDist = 0;
        switch on raceDist {
            when 'full' {
                RunDist = 26.2;
            }
            when 'half' {
                RunDist = 13.1;
            }
            when 'oly' {
                RunDist = 6.2;
            }
            when 'sprint' {
                RunDist = 3.1;
            }
        }
		String colon = ':';
		Integer RunMin = Integer.valueOf(runPace.subStringBefore(colon));
        Integer RunSec = Integer.valueOf(runPace.subStringAfter(colon));
        //calculate the run pace in seconds
        Integer runTimeSec = (RunMin * 60) + RunSec;
        Decimal runTime = RunDist * runTimeSec;
        //send the time back
        return runTime;
    }
    
    //method to add all of the times
    public static Decimal AddLegs(Decimal Transitions, Decimal TotalSwim, Decimal TotalBike, Decimal TotalRun) {
		Decimal TotalRaceSec = Transitions + TotalSwim + TotalBike + TotalRun;
		return TotalRaceSec;
    }
    

    //method to convert total race seconds to string time
    private static String Seconds2Time(Decimal RaceInterval) {
        //turn total seconds of predicted race time into string of hh:mm:ss
        Integer TotalSeconds = Integer.valueOf(RaceInterval);
		Integer RaceHours = 0;
		Integer RaceMinutes = 0;
		Integer RaceSeconds = 0;
        RaceHours = TotalSeconds / 3600;
		RaceMinutes = (TotalSeconds - RaceHours * 3600) / 60;
		RaceSeconds = TotalSeconds - (RaceHours * 3600) - (RaceMinutes * 60);
		String formattedMins = RaceMinutes < 10 ? '0' + RaceMinutes : String.valueOf(RaceMinutes);
		String formattedSecs = RaceSeconds < 10 ? '0' + RaceSeconds : String.valueOf(RaceSeconds);
        String TotalRaceTime = String.valueOf(RaceHours) + ':' + formattedMins + ':' + formattedSecs;
        return TotalRaceTime;
    }
}



-------------------------
RaceCalculatorTest.apxc -
-------------------------

@isTest
public class RaceCalculatorTest {
    @testSetup
    static void setupTestData() {
        //shared test data
    }
    
    //test for beginner and sprint, all good
    @isTest
    static void testBeginSprintAllGood() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '2:00';
        Integer testBike = 10;
        String testRun = '12:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with valid sprint inputs
        String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
        // store the result
        Test.stopTest();
        // assert the result is not null
        System.assertNotEquals(null, result, 'Result should not be null');
        // assert an Athlete record was created
        List<Athlete__c> athletes = [SELECT Id FROM Athlete__c WHERE Name = 'TestAthlete'];
		System.assertEquals(1, athletes.size(), 'One athlete record should be created');
        // assert a Race Prediction record was created
        List<Race_Prediction__c> predictions = [SELECT Id FROM Race_Prediction__c WHERE Athlete__c = :athletes[0].Id];
        System.assertEquals(1, predictions.size(), 'One race prediction should be created');
    }
    //test for experienced and Olympic, all good
    @isTest
    static void testExpOlyAllGood() {
        // generate test data
        String testAthleteName = 'TestAthlete2';
        Integer testAthleteAge = 40;
        String testSwim = '1:40';
        Integer testBike = 15;
        String testRun = '10:00';
        String testXP = 'Experienced';
        String testRace = 'oly';
        Test.startTest();
        // call CalculateRace with valid sprint inputs
        String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
        // store the result
        Test.stopTest();
        // assert the result is not null
        System.assertNotEquals(null, result, 'Result should not be null');
        // assert an Athlete record was created
        List<Athlete__c> athletes = [SELECT Id FROM Athlete__c WHERE Name = 'TestAthlete2'];
		System.assertEquals(1, athletes.size(), 'One athlete record should be created');
        // assert a Race Prediction record was created
        List<Race_Prediction__c> predictions = [SELECT Id FROM Race_Prediction__c WHERE Athlete__c = :athletes[0].Id];
        System.assertEquals(1, predictions.size(), 'One race prediction should be created');
    }
    //test for competitive and half iron, all good
    @isTest
    static void testCompHalfAllGood() {
        // generate test data
        String testAthleteName = 'TestAthlete3';
        Integer testAthleteAge = 40;
        String testSwim = '1:40';
        Integer testBike = 15;
        String testRun = '10:00';
        String testXP = 'Competitive';
        String testRace = 'half';
        Test.startTest();
        // call CalculateRace with valid sprint inputs
        String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
        // store the result
        Test.stopTest();
        // assert the result is not null
        System.assertNotEquals(null, result, 'Result should not be null');
        // assert an Athlete record was created
        List<Athlete__c> athletes = [SELECT Id FROM Athlete__c WHERE Name = 'TestAthlete3'];
		System.assertEquals(1, athletes.size(), 'One athlete record should be created');
        // assert a Race Prediction record was created
        List<Race_Prediction__c> predictions = [SELECT Id FROM Race_Prediction__c WHERE Athlete__c = :athletes[0].Id];
        System.assertEquals(1, predictions.size(), 'One race prediction should be created');
    }
    //test for pro and full iron, all good
    @isTest
    static void testProFullAllGood() {
        // generate test data
        String testAthleteName = 'TestAthlete4';
        Integer testAthleteAge = 40;
        String testSwim = '1:20';
        Integer testBike = 15;
        String testRun = '8:00';
        String testXP = 'Pro';
        String testRace = 'full';
        Test.startTest();
        // call CalculateRace with valid sprint inputs
        String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
        // store the result
        Test.stopTest();
        // assert the result is not null
        System.assertNotEquals(null, result, 'Result should not be null');
        // assert an Athlete record was created
        List<Athlete__c> athletes = [SELECT Id FROM Athlete__c WHERE Name = 'TestAthlete4'];
		System.assertEquals(1, athletes.size(), 'One athlete record should be created');
        // assert a Race Prediction record was created
        List<Race_Prediction__c> predictions = [SELECT Id FROM Race_Prediction__c WHERE Athlete__c = :athletes[0].Id];
        System.assertEquals(1, predictions.size(), 'One race prediction should be created');
    }
    
    //test to check for swim without :
    @isTest
    static void testBadSwim() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '200';
        Integer testBike = 10;
        String testRun = '12:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for run without :
    @isTest
    static void testBadRun() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '2:00';
        Integer testBike = 10;
        String testRun = '1200';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for swim with 0 for min
    @isTest
    static void testTooFastSwim() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '0:30';
        Integer testBike = 10;
        String testRun = '2:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for run too fast
    @isTest
    static void testTooFastRun() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '2:00';
        Integer testBike = 10;
        String testRun = '2:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for run with all zeros
    @isTest
    static void testRunAllZero() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '2:00';
        Integer testBike = 10;
        String testRun = '0:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for swim with all zeros
    @isTest
    static void testSwimAllZero() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '0:00';
        Integer testBike = 10;
        String testRun = '8:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for swim with bad seconds
    @isTest
    static void testSwimBadSec() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '1:72';
        Integer testBike = 10;
        String testRun = '8:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for run with bad seconds
    @isTest
    static void testRunBadSec() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '2:22';
        Integer testBike = 10;
        String testRun = '8:72';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for bike with zero
    @isTest
    static void testBikeZero() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '2:00';
        Integer testBike = 0;
        String testRun = '8:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for bike too fast
    @isTest
    static void testBikeTooFast() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '2:00';
        Integer testBike = 50;
        String testRun = '8:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for swim bad input
    @isTest
    static void testSwimBadInput() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '200:00';
        Integer testBike = 10;
        String testRun = '8:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
    //test to check for run bad input
    @isTest
    static void testRunBadInput() {
        // generate test data
        String testAthleteName = 'TestAthlete';
        Integer testAthleteAge = 40;
        String testSwim = '2:00';
        Integer testBike = 10;
        String testRun = '800:00';
        String testXP = 'Novice';
        String testRace = 'sprint';
        Test.startTest();
        // call CalculateRace with sprint inputs
        try {
            String result = RaceCalculator.CalculateRace(testAthleteName, testAthleteAge, testSwim, testBike, testRun, testXP, testRace);
            System.assert(false, 'Exception should be thrown');
        } catch(AuraHandledException e) {
            System.assertNotEquals(null, e.getMessage(), 'Exception message should not be null');
        }
        // store the result
        Test.stopTest();
    }
}