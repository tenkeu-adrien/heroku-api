import { VehicleTypes, RideStatuses, PaymentMethods } from 'App/Enums/Rides'
import Ride from 'App/Models/Ride'
import Factory from '@ioc:Adonis/Lucid/Factory'
import { UserFactory } from './UserFactory'
import { DateTime } from 'luxon'

const doualaNeighborhoods = [
  'Akwa', 'Bonapriso', 'Bali', 'Deido', 'Bepanda', 'Logbaba', 'Makepe', 'Bonamoussadi', 'PK 14', 'Ndokoti'
]

const getRandomDoualaCoordinates = () => ({
  latitude: 4.05 + Math.random() * 0.1,
  longitude: 9.70 + Math.random() * 0.1
})

const landmarks = [
  {
    name: 'Hôpital Laquintinie',
    address: 'Rue de la Gendarmerie, Akwa, Douala',
    coordinates: { latitude: 4.0486, longitude: 9.7064 }
  },
  // ... autres landmarks
]

export const RideFactory = Factory
  .define(Ride, ({ faker }) => {
    const isDelivery = faker.datatype.boolean(0.3)
    const isScheduled = faker.datatype.boolean(0.2)

    const useLandmarkPickup = faker.datatype.boolean(0.3)
    const useLandmarkDestination = faker.datatype.boolean(0.3)

    const pickup = useLandmarkPickup
      ? faker.helpers.arrayElement(landmarks)
      : {
          address: `${faker.location.streetAddress()}, ${faker.helpers.arrayElement(doualaNeighborhoods)}, Douala`,
          coordinates: getRandomDoualaCoordinates()
        }

    const destination = useLandmarkDestination
      ? faker.helpers.arrayElement(landmarks)
      : {
          address: `${faker.location.streetAddress()}, ${faker.helpers.arrayElement(doualaNeighborhoods)}, Douala`,
          coordinates: getRandomDoualaCoordinates()
        }

    // Convertir les objets en JSON string pour les champs de localisation
    const pickupLocation = JSON.stringify({
      address: pickup.address,
      coordinates: pickup.coordinates
    })

    const destinationLocation = JSON.stringify({
      address: destination.address,
      coordinates: destination.coordinates
    })

    // Convertir le recipient en JSON string si nécessaire
    const recipient = isDelivery
      ? JSON.stringify({
          name: faker.person.fullName(),
          contact: faker.phone.number(),
          address: `${faker.location.streetAddress()}, ${faker.helpers.arrayElement(doualaNeighborhoods)}, Douala`,
        })
      : undefined

    return {
      vehicleType: faker.helpers.arrayElement(Object.values(VehicleTypes)) as 'moto-taxi' | 'tricycle',
      pickupLocation,
      destinationLocation,
      status: faker.helpers.arrayElement(Object.values(RideStatuses)),
      scheduledAt: isScheduled ? DateTime.now().plus({ days: faker.number.int({ min: 1, max: 7 }) }) : null,
      startedAt: faker.datatype.boolean(0.6)
        ? DateTime.now().minus({ minutes: faker.number.int({ min: 5, max: 120 }) })
        : null,
      completedAt: faker.datatype.boolean(0.4) ? DateTime.now() : null,
      price: parseFloat(faker.finance.amount({ min: 1500, max: 10000, dec: 0 })),
      paymentMethod: faker.helpers.arrayElement(Object.values(PaymentMethods)),
      isPaid: faker.datatype.boolean(0.7),
      distance: faker.number.float({ min: 1, max: 50, precision: 0.1 }),
      duration: `${faker.number.int({ min: 5, max: 120 })} min`,
      clientId: 2,
      driverId: 1,
      recipient
    }
  })
  .relation('client', () => UserFactory)
  .relation('driver', () => UserFactory)
  .build()