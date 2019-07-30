export const timeDifferenceCalculator = (past:string): number => {
    let timeDifference:number = new Date().getTime() - new Date(past).getTime();
    timeDifference = parseInt(timeDifference.toFixed(0)) / 1000;
    return timeDifference;
}