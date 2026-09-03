import { Injectable, signal } from "@angular/core";
import { UserDataModel } from "../api";

@Injectable({
  providedIn: 'root'
})
export class StateService {

    private readonly watchingUser = signal<UserDataModel | null | undefined>(undefined);
    watchingUser$ = this.watchingUser.asReadonly();

    setUser(user: UserDataModel | null) {
        this.watchingUser.set(user);
    }
}
