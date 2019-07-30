export const timeDifferenceCalculator = (present:Date ,past:string): number => {
    let timeDifference:number = present.getTime() - new Date(past).getTime();
    timeDifference = parseInt(timeDifference.toFixed(0)) / 1000;
    return timeDifference;
}