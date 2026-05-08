const activities = [
  {
    activity: 'Maintenance Created',
    detail: 'Maintenance request created',
    asset: 'Printer Canon G1030',
    assetCode: 'AST-0002',
    user: 'Moch Rifat Syahman',
    role: 'Technician',
    time: '2 Mei 2026, 5:16 PM',
    status: 'Pending',
  },
  {
    activity: 'Asset Updated',
    detail: 'Asset information updated',
    asset: 'Printer Canon G1030',
    assetCode: 'AST-0002',
    user: 'Yasmeen Almira',
    role: 'Admin',
    time: '2 Mei 2026, 5:16 PM',
    status: 'Success',
  },
];

export default function RecentActivities() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800">
          Recent Activities
        </h2>

        <button className="text-blue-600 hover:text-blue-700 font-medium transition">
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wide">
            <tr>
              <th className="text-left px-6 py-4">Activity</th>
              <th className="text-left px-6 py-4">Asset</th>
              <th className="text-left px-6 py-4">User</th>
              <th className="text-left px-6 py-4">Time</th>
              <th className="text-left px-6 py-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {activities.map((item, index) => (
              <tr
                key={index}
                className={`border-t border-gray-100 hover:bg-gray-50 transition ${
                  index % 2 === 0
                    ? 'bg-white'
                    : 'bg-gray-50/50'
                }`}
              >
                <td className="px-6 py-5">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {item.activity}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {item.detail}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-5">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {item.asset}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {item.assetCode}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-5">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {item.user}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {item.role}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-5 text-gray-600">
                  {item.time}
                </td>

                <td className="px-6 py-5">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      item.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}