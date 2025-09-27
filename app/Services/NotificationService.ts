// app/Services/NotificationService.ts
import PushToken from 'App/Models/PushToken';
import axios from 'axios';

export default class NotificationService {
  static async sendToUser(userId: number, title: string, body: string, data = {}) {
    const pushToken = await PushToken.query().where('user_id', userId).first();
    if (!pushToken) return;
console.log("user" , pushToken)
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
    console.log("data dans sendDriver", data)
    
    const tokens = await PushToken.query()
      .preload('user')
      .whereHas('user', (q) => {
        q.where('role', 'driver')
         .where('vehiculeType', data.vehicleType)
         .where('isDeleted', false)
      });
  
    // Filtrage manuel côté JavaScript pour être sûr
    const filteredTokens = tokens.filter(token => 
      token.user && 
      token.user.role === 'driver' && 
      token.user.vehiculeType === data.vehicleType && 
      !token.user.isDeleted
    );
  
    // console.log("Tokens filtrés:", filteredTokens)
    
    for (const t of filteredTokens) {
      const response = await axios.post('https://exp.host/--/api/v2/push/send', {
        to: t.token,
        sound: 'assets/notification',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default'
      });
    }
  }
}
