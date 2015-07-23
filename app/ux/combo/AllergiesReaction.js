/**
 * GaiaEHR (Electronic Health Records)
 * Copyright (C) 2013 Certun, LLC.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

Ext.define('App.ux.combo.AllergiesReaction',{
		extend: 'Ext.form.ComboBox',
		alias: 'widget.mitos.allergiesreactioncombo',
		initComponent: function(){
			var me = this;

			// Define the Model on the Fly
			Ext.define('allergiesreactionModel',{
				extend: 'Ext.data.Model',
				fields: [
					{
						name: 'option_name',
						type: 'string'
					},
					{
						name: 'option_value',
						type: 'string'
					}
				],
				proxy: {
					type: 'direct',
					api: {
						read: 'CombosData.getOptionsByListId'
					}
				}
			});

			Ext.apply(this,{
				editable: false,
				queryMode: 'local',
				displayField: 'option_name',
				valueField: 'option_value',
				emptyText: _('select'),
				store: Ext.create('Ext.data.Store',{
					model: 'allergiesreactionModel',
					autoLoad: false
				})
			});
			me.callParent(arguments);
		}
	});