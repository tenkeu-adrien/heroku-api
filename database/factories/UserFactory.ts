import { Vehiclee } from './../../app/Enums/Roles';
import User from 'App/Models/User'
import Factory from '@ioc:Adonis/Lucid/Factory'
import { Roles } from 'App/Enums/Roles'

export const UserFactory = Factory
  .define(User, ({ faker }) => {
    // Générer un matricule uniquement pour les chauffeurs
    const role = faker.helpers.arrayElement(Object.values(Roles));
    const isDriver = role === Roles.DRIVER;
    
    return {
      firstName: faker.internet.userName(),
      phone: generateCameroonianPhoneNumber(faker), // Utilisation de notre nouvelle fonction
      password: 'password123!',
      matricule: isDriver ? generateMatricule(faker) : undefined, // Génère seulement pour les drivers
      role: role,
      isVerified: faker.datatype.boolean(),
      vehiculeType: isDriver ? faker.helpers.arrayElement(Object.values(Vehiclee)) : undefined,
    }
  })
  .build()

// Fonction helper pour générer un matricule réaliste
function generateMatricule(faker) {
  const letters = faker.random.alpha({ count: 2, upcase: true });
  const numbers = faker.random.numeric(5);
  return `${letters}${numbers}`;
}

// Fonction pour générer un numéro de téléphone camerounais valide (9 chiffres, commençant par 6)
function generateCameroonianPhoneNumber(faker) {
  // Commence toujours par 6 (pour Cameroun)
  const prefix = '6';
  // Génère 8 chiffres aléatoires
  const suffix = faker.random.numeric(8);
  return `${prefix}${suffix}`;
}