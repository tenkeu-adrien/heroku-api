// app/Services/NotificationService.ts
import PushToken from 'App/Models/PushToken';
import axios from 'axios';

export default class NotificationService {
  static async sendToUser(userId: number, title: string, body: string, data:any) {
    // console.log("Sending notification to user:", userId, title, body, data);
    const pushToken = await PushToken.query().where('user_id', userId).first();
    if (!pushToken){
      // console.log("No push token found for user:", userId);
      return;
    } 
    await axios.post('https://exp.host/--/api/v2/push/send', {
      to: pushToken.token,
      sound: 'assets/notification',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default'
    });
  }

static async sendToDrivers(title: string, body: string, data = {}) {
  // console.log("data vehicle type", data.vehicleType);

  const tokens = await PushToken.query()
    .preload('user')
    .whereHas('user', (q) => {
      q.where('role', 'driver')
       .whereNotNull('vehicule_type')           // important si NULL
       .where('vehicule_type', data.vehicleType)
       .where('is_deleted', false);
    });

  console.log("tokens trouvés:", tokens);
  console.log("users:", tokens.map(t => ({
    id: t.userId,
    role: t.$preloaded.user?.role,
    vehicule_type: t.$preloaded.user?.vehiculeType
  })));

  if (tokens.length === 0) {
    console.log("Aucun driver trouvé pour", data.vehicleType);
    return;
  }

  const notifications = tokens.map(t =>
    axios.post('https://exp.host/--/api/v2/push/send', {
      to: t.token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default'
    })
  );

  await Promise.all(notifications);
}
}
