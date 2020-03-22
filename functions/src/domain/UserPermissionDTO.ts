import { Permission } from "../service/AccountService";

export class UserPermissionDTO {
    constructor(public uid: string, public permissions: Array<Permission> ){}
}