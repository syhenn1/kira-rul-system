'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AssetsPage;
var link_1 = require("next/link");
var react_1 = require("react");
var Sidebar_1 = require("@/components/Sidebar");
var assets = [
    {
        id: 'AST-0001',
        name: 'Laptop Dell XPS 13',
        category: 'Laptop',
        condition: 'In Use',
        location: 'IT Room',
        lastAction: '16 May, 2024',
    },
    {
        id: 'AST-0002',
        name: 'Monitor LG 24MD43',
        category: 'Monitor',
        condition: 'Available',
        location: 'Bricks Eatery',
        lastAction: '15 May, 2024',
    },
    {
        id: 'AST-0003',
        name: 'Chair Ergonomic X200',
        category: 'Furniture',
        condition: 'In Use',
        location: 'Marketing Room',
        lastAction: '14 May, 2024',
    },
    {
        id: 'AST-0004',
        name: 'Projector Epson X200',
        category: 'Projector',
        condition: 'Maintenance',
        location: 'Meeting Room',
        lastAction: '13 May, 2024',
    },
    {
        id: 'AST-0005',
        name: 'Printer Canon E3200',
        category: 'Printer',
        condition: 'Available',
        location: 'Finance Room',
        lastAction: '12 May, 2024',
    },
];
function AssetsPage() {
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var filteredAssets = assets.filter(function (asset) {
        return asset.name
            .toLowerCase()
            .includes(search.toLowerCase());
    });
    return (<>
      <Sidebar_1.default />

      <main className="min-h-screen bg-[#F5F7FB] ml-64 p-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">

          <div>
            <h1 className="text-5xl font-bold text-[#111827]">
              Assets
            </h1>

            <p className="text-gray-500 mt-3 text-lg">
              Manage and monitor all company assets
            </p>
          </div>

          {/* ADD BUTTON */}
          <link_1.default href="/assets/add" className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-4 rounded-2xl font-semibold shadow-lg shadow-blue-600/20">
            + Add Asset
          </link_1.default>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-6 mb-8">

          <StatCard title="Total Assets" value="2,500"/>

          <StatCard title="In Use" value="936"/>

          <StatCard title="Available" value="800"/>

          <StatCard title="Maintenance" value="120"/>
        </div>

        {/* SEARCH */}
        <div className="bg-white rounded-3xl border shadow-sm p-6 mb-8">

          <div className="flex gap-4">

            <input type="text" placeholder="Search assets..." value={search} onChange={function (e) {
            return setSearch(e.target.value);
        }} className="flex-1 border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder:text-gray-400"/>

            <select className="border rounded-2xl px-5 py-4 text-gray-500">

              <option>
                All Status
              </option>

              <option>
                Available
              </option>

              <option>
                In Use
              </option>

              <option>
                Maintenance
              </option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="border-b bg-gray-50">

                <tr className="text-left text-sm text-gray-500">

                  <th className="px-6 py-5">
                    Asset Name
                  </th>

                  <th className="px-6 py-5">
                    Asset ID
                  </th>

                  <th className="px-6 py-5">
                    Category
                  </th>

                  <th className="px-6 py-5">
                    Condition
                  </th>

                  <th className="px-6 py-5">
                    Location
                  </th>

                  <th className="px-6 py-5">
                    Last Action
                  </th>

                  <th className="px-6 py-5">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredAssets.map(function (asset) { return (<tr key={asset.id} className="border-b hover:bg-gray-50 transition">

                      <td className="px-6 py-5 font-semibold text-[#111827]">

                        <link_1.default href={"/assets/".concat(asset.id)} className="hover:text-blue-600">
                          {asset.name}
                        </link_1.default>
                      </td>

                      <td className="px-6 py-5 text-gray-500">
                        {asset.id}
                      </td>

                      <td className="px-6 py-5 text-gray-600">
                        {asset.category}
                      </td>

                      <td className="px-6 py-5">

                        <span className={"px-3 py-1 rounded-full text-sm font-medium ".concat(asset.condition ===
                'Available'
                ? 'bg-green-100 text-green-700'
                : asset.condition ===
                    'Maintenance'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-blue-700')}>
                          {asset.condition}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-gray-600">
                        {asset.location}
                      </td>

                      <td className="px-6 py-5 text-gray-500">
                        {asset.lastAction}
                      </td>

                      <td className="px-6 py-5">

                        <div className="flex gap-3">

                          <link_1.default href={"/assets/".concat(asset.id)} className="text-blue-600 hover:text-blue-700 font-medium">
                            View
                          </link_1.default>

                          <button className="text-red-500 hover:text-red-600 font-medium">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>); })}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between px-6 py-5">

            <p className="text-gray-500 text-sm">
              Showing 1-5 of 100 assets
            </p>

            <div className="flex gap-3">

              <button className="w-10 h-10 rounded-xl bg-blue-600 text-white">
                1
              </button>

              <button className="w-10 h-10 rounded-xl border">
                2
              </button>

              <button className="w-10 h-10 rounded-xl border">
                3
              </button>
            </div>
          </div>
        </div>
      </main>
    </>);
}
function StatCard(_a) {
    var title = _a.title, value = _a.value;
    return (<div className="bg-white rounded-3xl border shadow-sm p-6">

      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <h2 className="text-4xl font-bold text-[#111827] mt-3">
        {value}
      </h2>
    </div>);
}
