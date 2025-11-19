import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Dishes extends BaseSchema {
  protected tableName = 'dishes'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.text('description').notNullable()
      table.integer('price').notNullable()
      table.integer('likes').defaultTo(0)
      table.integer('dislikes').defaultTo(0)
      table.json('images').notNullable()
      table.integer('restaurant_id').unsigned().references('id').inTable('restaurants').onDelete('CASCADE')
     table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}