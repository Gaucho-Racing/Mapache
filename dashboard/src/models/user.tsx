export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  gender: string;
  birthday: string;
  graduate_level: string;
  graduation_year: number;
  major: string;
  shirt_size: string;
  jacket_size: string;
  sae_registration_number: string;
  avatar_url: string;
  verified: boolean;
  subteams: Subteam[];
  roles: string[];
  updated_at: string;
  created_at: string;
}

export interface Subteam {
  id: string;
  name: string;
  created_at: string;
}

export const initUser: User = {
  id: "",
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  gender: "",
  birthday: "",
  graduate_level: "",
  graduation_year: 0,
  major: "",
  shirt_size: "",
  jacket_size: "",
  sae_registration_number: "",
  avatar_url: "",
  verified: false,
  subteams: [],
  roles: [],
  updated_at: "",
  created_at: "",
};
