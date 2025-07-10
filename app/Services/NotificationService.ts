// app/Services/NotificationService.ts
import PushToken from 'App/Models/PushToken';
import axios from 'axios';

export default class NotificationService {
  static async sendToUser(userId: number, title: string, body: string, data = {}) {
    const pushToken = await PushToken.query().where('user_id', userId).first();
    if (!pushToken) return;

    await axios.post('https://exp.host/--/api/v2/push/send', {
      to: pushToken.token,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  static async sendToDrivers(title: string, body: string, data = {}) {
    const tokens = await PushToken.query()
      .preload('user', q => q.where('role', 'driver'));

      console.log("token pour notifier les chauffeurs" ,tokens)
    for (const t of tokens) {
      console.log("t.token" ,t.token)
  const response=    await axios.post('https://exp.host/--/api/v2/push/send', {
        to: t.token,
        sound: 'default',
        title,
        body,
        data,
      });

      console.log("response apres puhs" ,response)
    }
  }
}
