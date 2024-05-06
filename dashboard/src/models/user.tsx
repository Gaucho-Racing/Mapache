export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subteam: string;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
}

// function setUser(user: User, userInput: any): void {
//   user.id = userInput.id || user.id;
//   user.firstName = userInput.firstName || user.firstName;
//   user.lastName = userInput.lastName || user.lastName;
//   user.email = userInput.email || user.email;
//   user.subteam = userInput.subteam || user.subteam;
//   user.createdAt = userInput.createdAt || user.createdAt;
//   user.updatedAt = userInput.updatedAt || user.updatedAt;
//   user.roles = userInput.roles || user.roles;
// }

export const initUser = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  subteam: "",
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [],
};
