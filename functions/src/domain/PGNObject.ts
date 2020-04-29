export class PGNObject {
    constructor(public white: string, public black: string,
        public event: string, public pgnString: string, public result: string) {
    }

    toString(): string{
        const date = new Date();
        return `[Event "${this.event}"]\n[Date "${date.getFullYear()}.${date.getMonth()}.${date.getDate()}"]\n[White "${this.white}"]\n[Black "${this.black}"]\n[Result "${this.result}"]\n${this.pgnString} ${this.result}`
    }
}