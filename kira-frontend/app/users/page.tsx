'use client';

import { useState } from 'react';

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function UsersPage() {
  const users = [
    {
      name: 'Yasmeen A.',
      email: 'yasmeen@postech.com',
      role: 'Admin',
      assets: 12,
      status: 'Active',
    },
    {
      name: 'Agus Setiawan',
      email: 'agus@postech.com',
      role: 'Technician',
      assets: 8,
      status: 'Active',
    },
    {
      name: 'Ricky Pratama',
      email: 'ricky@postech.com',
      role: 'Staff',
      assets: 5,
      status: 'Active',
    },
    {
      name: 'Dimas Saputra',
      email: 'dimas@postech.com',
      role: 'Staff',
      assets: 7,
      status: 'Active',
    },
    {
      name: 'Siti Nurhaliza',
      email: 'siti@postech.com',
      role: 'Technician',
      assets: 6,
      status: 'Inactive',
    },
  ];

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      user.email
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'All Roles' ||
      user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getStatus = (status: string) => {
    if (status === 'Active') {
      return 'bg-green-100 text-green-700';
    }

    return 'bg-red-100 text-red-600';
  };

  return (
    <main className="flex min-h-screen bg-[#F4F7FE]">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">

        <Topbar />

        {/* HEADER */}
        <div className="flex items-center justify-between mt-8">

          <div>
            <h1 className="text-5xl font-bold text-gray-900">
              Users
            </h1>

            <p className="text-gray-500 mt-3 text-lg">
              Manage system users and assigned assets
            </p>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-3 rounded-2xl font-medium shadow-lg shadow-blue-200">
            + Add User
          </button>
        </div>

        {/* FILTER */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mt-8">

          <div className="flex flex-col lg:flex-row gap-4">

            {/* SEARCH */}
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="flex-1 border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-700"
            />

            {/* ROLE FILTER */}
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value)
              }
              className="border border-gray-200 rounded-2xl px-5 py-4 text-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All Roles</option>
              <option>Admin</option>
              <option>Technician</option>
              <option>Staff</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mt-6 overflow-x-auto">

          <table className="w-full min-w-[900px]">

            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-400">

                <th className="pb-5 font-medium">
                  Name
                </th>

                <th className="pb-5 font-medium">
                  Email
                </th>

                <th className="pb-5 font-medium">
                  Role
                </th>

                <th className="pb-5 font-medium">
                  Assigned Assets
                </th>

                <th className="pb-5 font-medium">
                  Status
                </th>

                <th className="pb-5 font-medium text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-50 hover:bg-gray-50 transition"
                >

                  <td className="py-5">

                    <div className="flex items-center gap-4">

                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {user.name.charAt(0)}
                      </div>

                      <span className="font-medium text-gray-800">
                        {user.name}
                      </span>
                    </div>
                  </td>

                  <td className="text-gray-500">
                    {user.email}
                  </td>

                  <td className="text-gray-700 font-medium">
                    {user.role}
                  </td>

                  <td className="text-gray-500">
                    {user.assets}
                  </td>

                  <td>
                    <span
                      className={`px-4 py-1 rounded-full text-sm font-medium ${getStatus(
                        user.status
                      )}`}
                    >
                      {user.status}
                    </span>
                  </td>

                  <td className="text-center text-gray-400 text-2xl cursor-pointer">
                    ⋮
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* EMPTY STATE */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              No users found
            </div>
          )}

          {/* FOOTER */}
          <div className="flex items-center justify-between mt-6">

            <p className="text-sm text-gray-500">
              Showing {filteredUsers.length} users
            </p>

            <div className="flex gap-2">

              <button className="w-10 h-10 rounded-xl bg-blue-600 text-white">
                1
              </button>

              <button className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500">
                2
              </button>

              <button className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500">
                3
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}