import { LightningElement, track } from 'lwc';
import calculateRace from '@salesforce/apex/RaceCalculator.CalculateRace';

export default class AthleteInfo extends LightningElement {
    @track totalTime = '';
    @track errorMessage = '';
    @track errors = false;
    @track result = false;

    //options for dropdown menus
    get raceTypeOptions() {
        return [
            { label: 'Sprint', value: 'sprint' },
            { label: 'Olympic', value: 'oly' },
            { label: 'Half Iron', value: 'half' },
            { label: 'Full Ironman', value: 'full' }
        ];
    }
    get experienceLevelOptions() {
        return [
            { label: 'Novice', value: 'Novice' },
            { label: 'Experienced', value: 'Experienced' },
            { label: 'Competitive', value: 'Competitive' },
            { label: 'Professional', value: 'Pro' }
        ];
    }
    // onchange handlers
    handleNameChange(event) {this.athleteName = event.target.value;}
    handleAgeChange(event) {this.athleteAge = event.target.value;}
    handleRaceChange(event) {this.raceType = event.target.value;}
    handleSwimChange(event) {this.swimPace = event.target.value;}
    handleBikeChange(event) {this.bikePace = event.target.value;}
    handleRunChange(event) {this.runPace = event.target.value;}
    handleXPChange(event) {this.experienceLevel = event.target.value;}

    // button handlers
    handleClick() {
        console.log('button clicked');
        //clear bottom stuff if there
        this.errorMessage = null;
        this.totalTime = null;
        this.errors = false;
        this.result = false;

        //insert inputted values into temps
        const athleteName = this.athleteName;
        const athleteAge = this.athleteAge;
        const swimPace = this.swimPace;
        const bikePace = this.bikePace;
        const runPace = this.runPace;
        const raceType = this.raceType;
        const xpLevel = this.experienceLevel;

        console.log('values:', athleteName, athleteAge, swimPace, bikePace, runPace, raceType, xpLevel);

        //validation check boolean
        let LWC_error = false;
        const colon = ":";

        //quick validation checks
        if (!athleteName) {
            LWC_error = true;
        }
        if (!athleteAge || athleteAge < 10) {
            LWC_error = true;
        }
        if (!bikePace || bikePace < 5 || bikePace > 40) {
            LWC_error = true;
        }
        if (!swimPace || !swimPace.includes(colon)) {
            LWC_error = true;
        }
        if (!runPace || !runPace.includes(colon)) {
            LWC_error = true;
        }
        if (!xpLevel) {
            LWC_error = true;
        }
        if (!raceType) {
            LWC_error = true;
        }

        console.log('After validation:', LWC_error);

        if(LWC_error) {
            this.errorMessage = 'Please check your inputs and try again.';
            this.errors = true;
            return;
        }

        console.log('calling apex');
        //send info to Apex class
        calculateRace({
            AthleteName: athleteName,
            AthleteAge: athleteAge,
            swimPace: swimPace,
            bikeSpeed: bikePace,
            runPace: runPace,
            xpLevel: xpLevel,
            raceDist: raceType
        })
        .then(result => {
            console.log('apex returned: ', result);
            this.totalTime = result;
            this.result = true;
            console.log('TotalTime property: ', this.totalTime);
            console.log('result property: ', result);
        })
        .catch(error => {
            console.log('apex errors: ', JSON.stringify(error));
            this.errorMessage = error.body.message;
            this.errors = true;
        });
    }

    //button to start a recalculation
    handleClearClick() {
        //clear error list and total time, if present
        // and hide lower sections
        this.errorMessage = null;
        this.totalTime = null;
        this.errors = false;
        this.result = false;
        //clear inputs
        this.athleteName = null;
        this.athleteAge = null;
        this.swimPace = null;
        this.bikePace = null;
        this.runPace = null;
        this.raceType = null;
        this.experienceLevel = null;
    }
}