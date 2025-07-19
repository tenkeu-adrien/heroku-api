import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Dishes extends BaseSchema {
  protected tableName = 'dishes'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.text('description').notNullable()
      table.decimal('price', 10, 2).notNullable()
      table.integer('likes').defaultTo(0)
      table.integer('dislikes').defaultTo(0)
      table.json('images').notNullable()
      table.integer('restaurant_id').unsigned().references('id').inTable('restaurants').onDelete('CASCADE')
      table.timestamps(true)
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}