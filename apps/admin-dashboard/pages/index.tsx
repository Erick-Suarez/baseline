import { Input } from "@/components/input";
import { useEffect, useState } from "react";
import supabase from "@/utils/supabase";
import * as bcrypt from "bcryptjs";
import { Listbox } from "@headlessui/react";
import { RiArrowDropDownLine } from "react-icons/ri";

const createNewUser = async (email: string, name: string, password: string) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  email = email.toLocaleLowerCase();

  const { data, error } = await supabase
    .from("users")
    .insert({ email, name, password: hashedPassword })
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const createNewOrganization = async (orgName: string) => {
  try {
    const adminUser = await createNewUser(
      `admin@${orgName.toLocaleLowerCase().replaceAll(" ", "")}.com`,
      "Admin",
      "123"
    );

    const createOrgResponse = await supabase
      .from("organizations")
      .insert({
        organization_name: orgName,
      })
      .select()
      .maybeSingle();

    if (createOrgResponse.error) {
      throw createOrgResponse.error;
    }

    if (!createOrgResponse.data || !adminUser) {
      throw "Invalid data";
    }

    const addAdminToOrganizationResponse = await supabase
      .from("organization_members")
      .insert({
        user_id: adminUser.user_id,
        organization_id: createOrgResponse.data.organization_id,
      });

    if (addAdminToOrganizationResponse.error) {
      throw addAdminToOrganizationResponse.error;
    }

    return createOrgResponse.data;
  } catch (err) {
    throw err;
  }
};

const assignUserToOrganization = async ({
  organization_id,
  user_id,
}: {
  organization_id: string;
  user_id: string;
}) => {
  const { error } = await supabase.from("organization_members").insert({
    organization_id,
    user_id,
  });

  if (error) {
    console.error(error);
  }
};

interface User {
  user_id: string;
  email: string;
  name: string;
  organization: Organization | null;
}

interface Organization {
  organization_id: string;
  organization_name: string;
}

export default function Home() {
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const [newOrganizationName, setNewOrganizationName] = useState("");

  const [organizations, setOrganizations] = useState<Array<Organization>>([]);
  const [users, setUsers] = useState<Array<User>>([]);

  const [refresh, setRefresh] = useState(false);

  const forceRefresh = () => {
    setRefresh((prev) => !prev);
  };

  useEffect(() => {
    const compareUsers = (user1: User, user2: User) => {
      if (user1.email > user2.email) {
        return 1;
      } else if (user1.email < user2.email) {
        return -1;
      } else {
        return 0;
      }
    };
    const getUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select(
          "user_id, email, name, organizations(organization_id, organization_name)"
        );

      if (error || !data) {
        // handler error
        console.error(error);
      } else {
        const usersWithOrganizations: Array<User> = [];
        const usersWithoutOrganizations: Array<User> = [];
        data.forEach((fetchedUser) => {
          const user: User = {
            user_id: fetchedUser.user_id,
            name: fetchedUser.name,
            email: fetchedUser.email,
            organization: null,
          };

          if (
            Array.isArray(fetchedUser.organizations) &&
            fetchedUser.organizations.length > 0
          ) {
            user.organization = fetchedUser.organizations[0];
            usersWithOrganizations.push(user);
          } else {
            usersWithoutOrganizations.push(user);
          }
        });

        usersWithoutOrganizations.sort(compareUsers);

        usersWithOrganizations.sort(compareUsers);

        setUsers([...usersWithoutOrganizations, ...usersWithOrganizations]);
      }
    };

    const getOrganizations = async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("organization_id, organization_name");

      if (error || !data) {
        console.error(error);
      } else {
        setOrganizations(data);
      }
    };

    getUsers();
    getOrganizations();
  }, [refresh]);

  return (
    <div>
      <div className="flex w-full justify-center border-b-2 border-slate-200 px-6 py-6">
        <h1 className="m-5 inline-block border-b-4 border-indigo-600 pb-2 text-4xl font-bold">
          Baseline Admin Dashboard
        </h1>
      </div>

      <div className="border-b-2 border-slate-200 px-10 pb-16 pt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createNewUser(newUserEmail, newUserName, newUserPassword).then(
              (data) => {
                forceRefresh();
              }
            );

            setNewUserEmail("");
            setNewUserName("");
            setNewUserPassword("");
          }}
          className="flex items-center justify-center gap-10"
        >
          <div className="flex flex-[0.5] flex-col gap-5">
            <h1 className="text-2xl font-bold">Create New User</h1>
            <p className="text-slate-400">Create a new user in users table</p>
          </div>

          <div className="flex flex-1 items-center gap-5">
            <Input
              required={true}
              placeholder="Email"
              type="email"
              value={newUserEmail}
              onChange={(e) => {
                setNewUserEmail(e.target.value);
              }}
            />
            <Input
              required={true}
              placeholder="Name"
              value={newUserName}
              onChange={(e) => {
                setNewUserName(e.target.value);
              }}
            />
            <Input
              required={true}
              placeholder="Password"
              value={newUserPassword}
              onChange={(e) => {
                setNewUserPassword(e.target.value);
              }}
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-10 py-4 text-lg font-bold text-white hover:bg-indigo-800"
            >
              Create
            </button>
            <button
              type="button"
              className="rounded-md px-5 py-4 text-lg font-bold text-slate-400 hover:text-slate-600"
              onClick={() => {
                setNewUserEmail("");
                setNewUserName("");
                setNewUserPassword("");
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createNewOrganization(newOrganizationName).then((data) => {
            forceRefresh();
          });

          setNewOrganizationName("");
        }}
        className="flex items-center justify-center gap-10 border-b-2 border-slate-200 px-10 pb-16 pt-6"
      >
        <div className="flex flex-[0.5] flex-col gap-5">
          <h1 className="text-2xl font-bold">Create New Organization</h1>
          <p className="text-slate-400">
            Create a new organization. This will also create an
            admin@organization.com account. The admin account will be added as
            an organization member
          </p>
        </div>

        <div className="flex flex-1 items-center gap-5">
          <Input
            required={true}
            value={newOrganizationName}
            onChange={(e) => {
              setNewOrganizationName(e.target.value);
            }}
          />

          <button className="rounded-md bg-indigo-600 px-10 py-4 text-lg font-bold text-white hover:bg-indigo-800">
            Create
          </button>
          <button
            type="button"
            className="rounded-md px-5 py-4 text-lg font-bold text-slate-400 hover:text-slate-600"
            onClick={() => {
              setNewOrganizationName("");
            }}
          >
            Clear
          </button>
        </div>
      </form>
      <div className="flex flex-col items-center justify-center gap-10 border-b-2 border-slate-200 px-10 pb-16 pt-6">
        <div className="text-center">
          <h1 className="mb-5 text-2xl font-bold">Add user to organization</h1>
          <p className="text-slate-400">Add a user to an organization.</p>
        </div>

        <div className="flex w-full max-w-[1440px] flex-1 items-center gap-5">
          <table className="text w-full text-left">
            <thead className="sticky top-0 z-50 bg-slate-200 shadow">
              <tr>
                <th scope="col" className="px-6 py-3 shadow">
                  user_id
                </th>
                <th scope="col" className="px-6 py-3 shadow">
                  email
                </th>
                <th scope="col" className="px-6 py-3 shadow">
                  name
                </th>
                <th scope="col" className="px-6 py-3 shadow">
                  organization
                </th>
              </tr>
            </thead>
            <tbody className="relative">
              {users.map((user) => {
                return (
                  <tr key={user.user_id} className="border-b bg-white">
                    <td className="px-6 py-4">{user.user_id}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">
                      {user.organization ? (
                        <p>
                          <span className="mx-2 font-bold">
                            {user.organization.organization_id}
                          </span>
                          {user.organization.organization_name}
                        </p>
                      ) : (
                        <Listbox
                          onChange={(value: Organization) => {
                            assignUserToOrganization({
                              organization_id: value.organization_id,
                              user_id: user.user_id,
                            }).then(() => {
                              forceRefresh();
                            });
                          }}
                        >
                          <Listbox.Button>
                            <div className="flex items-center border-2 border-red-400 p-2 font-bold text-red-400 hover:text-red-700">
                              <h1>No Organization</h1>
                              <RiArrowDropDownLine className="ml-2 h-6 w-6" />
                            </div>
                          </Listbox.Button>
                          <Listbox.Options className="absolute z-10 border-2 border-black bg-white">
                            {organizations.map((organization) => (
                              <Listbox.Option
                                key={`${user.user_id}-${organization.organization_id}`}
                                value={organization}
                              >
                                <button className="w-full p-2 text-left hover:bg-red-200">
                                  <p>
                                    <span className="mx-2 font-bold">
                                      {organization.organization_id}
                                    </span>
                                    {organization.organization_name}
                                  </p>
                                </button>
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Listbox>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
