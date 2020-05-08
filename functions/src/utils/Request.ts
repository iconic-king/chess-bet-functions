const request = require('request');

interface Options {
    url : string;
    json: any;
}

export const createPostRequestPromise = (reqOptions: Options) => {
    return new Promise((res, rej) => {
        request.post(reqOptions, (error, response) => {
            if(error) {
                console.error(error);
                rej({err: error});
            } else {
                console.log(response.body);
                res(response.body);
            }
        });
    });
}

export const createGetRequestPromise = (url: string) => {
    return new Promise((res, rej) => {
        request.get(url, (error, response) => {
            if(error) {
                console.error(error);
                rej({err: error});
            } else {
                res(response.body);
            }
        });
    });
}