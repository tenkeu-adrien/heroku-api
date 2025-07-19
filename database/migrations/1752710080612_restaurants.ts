import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Restaurants extends BaseSchema {
  protected tableName = 'restaurants'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.string('cuisine').notNullable()
      table.decimal('rating', 2, 1).defaultTo(0)
      table.string('delivery_time').notNullable()
      table.string('image').notNullable()
      table.integer('created_by').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.boolean('is_active').defaultTo(true)
      table.boolean('is_favorite').defaultTo(false)
      table.timestamps(true)
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}