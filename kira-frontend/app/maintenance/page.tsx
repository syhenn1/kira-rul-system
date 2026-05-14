import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function MaintenancePage() {
  const maintenances = [
    {
      id: 'MNT-0001',
      asset: 'Laptop Dell XPS 13',
      issue: 'Battery replacement',
      priority: 'Medium',
      status: 'Pending',
      assigned: 'Rudi Hermawan',
      due: '21 May, 2024',
    },
    {
      id: 'MNT-0002',
      asset: 'Printer Canon 1200D',
      issue: 'Paper jam',
      priority: 'Pending',
      status: 'Pending',
      assigned: '-',
      due: '-',
    },
    {
      id: 'MNT-0003',
      asset: 'Monitor LG 24MD43',
      issue: 'Flickering screen',
      priority: 'Low',
      status: 'Complete',
      assigned: 'Adi Nugroho',
      due: '19 May, 2024',
    },
    {
      id: 'MNT-0004',
      asset: 'Projector Epson X200',
      issue: 'Lamp replacement',
      priority: 'High',
      status: 'Pending',
      assigned: '-',
      due: '23 May, 2024',
    },
    {
      id: 'MNT-0005',
      asset: 'Keyboard Logitech K380',
      issue: 'Some keys not working',
      priority: 'Low',
      status: 'Complete',
      assigned: 'Rudi Hermawan',
      due: '18 May, 2024',
    },
  ];

  const getPriority = (priority: string) => {
    if (priority === 'High') {
      return 'bg-red-100 text-red-600';
    }

    if (priority === 'Medium') {
      return 'bg-yellow-100 text-yellow-700';
    }

    if (priority === 'Low') {
      return 'bg-green-100 text-green-700';
    }

    return 'bg-blue-100 text-blue-600';
  };

  const getStatus = (status: string) => {
    if (status === 'Complete') {
      return 'bg-green-100 text-green-700';
    }

    return 'bg-blue-100 text-blue-600';
  };

  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        {/* HEADER */}
        <div className="flex items-center justify-between mt-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Maintenance
            </h1>

            <p className="text-gray-500 mt-2">
              Manage asset maintenance schedules and requests
            </p>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-xl font-medium">
            + Schedule
          </button>
        </div>

        {/* FILTER */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mt-8">
          <div className="flex flex-col lg:flex-row gap-4">

            <input
              type="text"
              placeholder="Search..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              <option>All Status</option>
            </select>

            <select className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              <option>All Priority</option>
            </select>
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 gap-6 mt-6">

          {/* LOCATION */}
  
          {/* TABLE */}
          <div className="xl:col-span-3 bg-white rounded-2xl p-6 shadow-sm overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b border-gray-100 text-left text-sm text-gray-400">

                  <th className="pb-4 font-medium">
                    Request ID
                  </th>

                  <th className="pb-4 font-medium">
                    Asset
                  </th>

                  <th className="pb-4 font-medium">
                    Issue
                  </th>

                  <th className="pb-4 font-medium">
                    Priority
                  </th>

                  <th className="pb-4 font-medium">
                    Status
                  </th>

                  <th className="pb-4 font-medium">
                    Assigned To
                  </th>

                  <th className="pb-4 font-medium">
                    Due Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {maintenances.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-50 hover:bg-gray-50 transition"
                  >

                    <td className="py-5 font-medium text-gray-800">
                      {item.id}
                    </td>

                    <td className="text-gray-500">
                      {item.asset}
                    </td>

                    <td className="text-gray-500">
                      {item.issue}
                    </td>

                    <td>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getPriority(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatus(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="text-gray-500">
                      {item.assigned}
                    </td>

                    <td className="text-gray-500">
                      {item.due}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div className="flex items-center justify-between mt-6">

              <p className="text-sm text-gray-500">
                Showing 1-5 of 63 items
              </p>

              <div className="flex gap-2">
                <button className="w-9 h-9 rounded-lg bg-blue-600 text-white">
                  1
                </button>

                <button className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500">
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