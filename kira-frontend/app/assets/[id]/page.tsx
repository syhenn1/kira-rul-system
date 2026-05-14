import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function AssetsPage() {
  const assets = [
    {
      name: 'Laptop Dell XPS 13',
      id: 'AST-0001',
      category: 'Laptop',
      condition: 'In Use',
      location: 'IT Room',
      action: '16 May, 2026',
    },
    {
      name: 'Monitor LG 24MD43',
      id: 'AST-0002',
      category: 'Monitor',
      condition: 'Available',
      location: 'Meeting Room',
      action: '18 May, 2026',
    },
    {
      name: 'Projector Epson X200',
      id: 'AST-0003',
      category: 'Projector',
      condition: 'Maintenance',
      location: 'Finance Room',
      action: '20 May, 2026',
    },
    {
      name: 'Printer Canon G1030',
      id: 'AST-0004',
      category: 'Printer',
      condition: 'Available',
      location: 'IT Room',
      action: '22 May, 2026',
    },
  ];

  const getBadge = (condition: string) => {
    if (condition === 'Available') {
      return 'bg-green-100 text-green-700';
    }

    if (condition === 'Maintenance') {
      return 'bg-orange-100 text-orange-700';
    }

    return 'bg-blue-100 text-blue-700';
  };

  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        {/* HEADER */}
        <div className="mt-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Assets
          </h1>

          <p className="text-gray-500 mt-2">
            Manage and monitor all company assets
          </p>
        </div>

        {/* FILTER */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mt-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <input
              type="text"
              placeholder="Search assets..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              <option>All Status</option>
            </select>

            <select className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              <option>All Category</option>
            </select>

            <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-6 py-3 rounded-xl font-medium">
              Add Asset
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6">
          {/* COMPANY LIST */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Companies
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-700">
                  Company A
                </h3>

                <div className="mt-3 space-y-2 text-gray-500 text-sm">
                  <p>IT Department</p>
                  <p>Finance Department</p>
                  <p>HR Department</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">
                  Company B
                </h3>

                <div className="mt-3 space-y-2 text-gray-500 text-sm">
                  <p>Marketing</p>
                  <p>Sales</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">
                  Company C
                </h3>

                <div className="mt-3 space-y-2 text-gray-500 text-sm">
                  <p>Production</p>
                  <p>Warehouse</p>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="xl:col-span-3 bg-white rounded-2xl p-6 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sm text-gray-400">
                  <th className="pb-4 font-medium">
                    Asset Name
                  </th>

                  <th className="pb-4 font-medium">
                    Asset ID
                  </th>

                  <th className="pb-4 font-medium">
                    Category
                  </th>

                  <th className="pb-4 font-medium">
                    Condition
                  </th>

                  <th className="pb-4 font-medium">
                    Location
                  </th>

                  <th className="pb-4 font-medium">
                    Last Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {assets.map((asset, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-50 hover:bg-gray-50 transition"
                  >
                    <td className="py-5 font-medium text-gray-800">
                      {asset.name}
                    </td>

                    <td className="text-gray-500">
                      {asset.id}
                    </td>

                    <td className="text-gray-500">
                      {asset.category}
                    </td>

                    <td>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getBadge(
                          asset.condition
                        )}`}
                      >
                        {asset.condition}
                      </span>
                    </td>

                    <td className="text-gray-500">
                      {asset.location}
                    </td>

                    <td className="text-gray-500">
                      {asset.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Showing 1-4 of 100 assets
              </p>

              <div className="flex gap-2">
                <button className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500">
                  1
                </button>

                <button className="w-9 h-9 rounded-lg bg-blue-600 text-white">
                  2
                </button>

                <button className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500">
                  3
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}