import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function AlertsPage() {
  const alerts = [
    {
      title: '12 assets need maintenance',
      desc: 'These assets have passed their maintenance schedule',
      level: 'High',
      time: '6h ago',
      color: 'red',
    },
    {
      title: '7 assets overdue (not returned)',
      desc: 'These assets have not been returned after check out',
      level: 'Medium',
      time: '1d ago',
      color: 'orange',
    },
    {
      title: '23 assets check-in today',
      desc: 'Assets have been checked in today',
      level: 'Info',
      time: '2h ago',
      color: 'blue',
    },
    {
      title: '5 assets in damaged condition',
      desc: 'These assets need immediate attention',
      level: 'High',
      time: '3h ago',
      color: 'red',
    },
    {
      title: 'Maintenance scheduled tomorrow',
      desc: '10 assets have maintenance scheduled tomorrow',
      level: 'Info',
      time: '1d ago',
      color: 'blue',
    },
  ];

  const getBadge = (level: string) => {
    if (level === 'High') {
      return 'bg-red-100 text-red-600';
    }

    if (level === 'Medium') {
      return 'bg-yellow-100 text-yellow-700';
    }

    return 'bg-blue-100 text-blue-600';
  };

  const getIcon = (color: string) => {
    if (color === 'red') {
      return (
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl font-bold">
          !
        </div>
      );
    }

    if (color === 'orange') {
      return (
        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 text-xl font-bold">
          !
        </div>
      );
    }

    return (
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
        i
      </div>
    );
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
              Alerts
            </h1>

            <p className="text-gray-500 mt-2">
              Monitor important notifications and asset alerts
            </p>
          </div>

          <button className="text-blue-600 font-medium hover:text-blue-700">
            All Alerts
          </button>
        </div>

        {/* ALERTS LIST */}
        <div className="mt-8 space-y-4">

          {alerts.map((alert, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">

                {/* LEFT */}
                <div className="flex items-center gap-5">

                  {getIcon(alert.color)}

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {alert.title}
                    </h2>

                    <p className="text-gray-500 mt-1">
                      {alert.desc}
                    </p>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-4">

                  <span
                    className={`px-4 py-1 rounded-full text-sm font-medium ${getBadge(
                      alert.level
                    )}`}
                  >
                    {alert.level}
                  </span>

                  <span className="text-gray-400 text-sm">
                    {alert.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Showing 1-5 of 5 alerts
        </div>
      </div>
    </main>
  );
}