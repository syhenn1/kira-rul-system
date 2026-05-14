import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function ActivityLogsPage() {
  const activities = [
    {
      user: 'Yasmeen A.',
      action: 'checked out Laptop Dell XPS 13',
      asset: 'AST-0001',
      detail: 'TI Room',
      time: '18 May 2024, 09:15 AM',
    },
    {
      user: 'Agus Setiawan',
      action: 'created maintenance request for Printer Canon G3010',
      asset: 'MNT-0002',
      detail: 'Paper Jam',
      time: '18 May 2024, 08:45 AM',
    },
    {
      user: 'Ricky Pratama',
      action: 'checked in Projector Epson X200',
      asset: 'AST-0005',
      detail: '-',
      time: '17 May 2024, 04:20 PM',
    },
    {
      user: 'Siti Nurhaliza',
      action: 'updated status of Monitor LG 24MK600 to Maintenance',
      asset: 'AST-0002',
      detail: '-',
      time: '17 May 2024, 02:30 PM',
    },
    {
      user: 'Dimas Saputra',
      action: 'added new asset Laptop MacBook Air M1',
      asset: 'AST-0007',
      detail: '-',
      time: '17 May 2024, 11:05 AM',
    },
  ];

  return (
    <main className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 p-8">
        <Topbar />

        {/* HEADER */}
        <div className="mt-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Activity Logs
          </h1>

          <p className="text-gray-500 mt-2">
            Track all activities and asset actions in realtime
          </p>
        </div>

        {/* FILTER */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mt-8">
          <div className="flex flex-col lg:flex-row gap-4">

            <input
              type="text"
              placeholder="Search logs..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-700"
            />

            <select className="border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              <option>All Activities</option>
            </select>
          </div>
        </div>

        {/* ACTIVITY LIST */}
        <div className="bg-white rounded-2xl shadow-sm mt-6 overflow-hidden">

          {activities.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-8 py-6 border-b border-gray-100 hover:bg-gray-50 transition"
            >

              {/* LEFT */}
              <div className="flex items-center gap-5">

                {/* AVATAR */}
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {activity.user.charAt(0)}
                </div>

                {/* CONTENT */}
                <div>
                  <h2 className="text-gray-900">
                    <span className="font-semibold text-blue-600">
                      {activity.user}
                    </span>{' '}
                    {activity.action}
                  </h2>

                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>{activity.asset}</span>

                    <span>•</span>

                    <span>{activity.detail}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="text-sm text-gray-400 whitespace-nowrap">
                {activity.time}
              </div>
            </div>
          ))}

        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Showing 1-5 of 5 activities
        </div>
      </div>
    </main>
  );
}