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

Ext.define('App.view.patient.Encounter', {
	extend: 'App.ux.RenderPanel',
	pageTitle: i18n('encounter'),
	pageLayout: 'border',
	itemId: 'encounterPanel',
	requires: [
		'App.store.patient.Encounters',
		'App.store.patient.Vitals',
		'App.store.administration.AuditLog',
		'App.view.patient.encounter.SOAP',
		'App.view.patient.encounter.HealthCareFinancingAdministrationOptions',
		'App.view.patient.encounter.CurrentProceduralTerminology',
		'App.view.patient.encounter.FamilyHistory',
		'App.view.patient.ProgressNote',
		'App.ux.combo.EncounterPriority',
		'App.view.patient.DecisionSupportWarningPanel'
	],

	enableCPT: eval(g('enable_encounter_cpt')),
	enableHCFA: eval(g('enable_encounter_hcfa')),
	enableSOAP: eval(g('enable_encounter_soap')),
	enableVitals: eval(g('enable_encounter_vitals')),
	enableEncHistory: eval(g('enable_encounter_history')),
	enableFamilyHistory: eval(g('enable_encounter_family_history')),
	enableItemsToReview: eval(g('enable_encounter_items_to_review')),
	enableReviewOfSystem: eval(g('enable_encounter_review_of_systems')),
	enableReviewOfSystemChecks: eval(g('enable_encounter_review_of_systems_cks')),
	enableClicnicaDecisionSupport: eval(g('enable_clinical_decision_support')),

	showRating: true,
	conversionMethod: 'english',

	pid: null,
	eid: null,
	encounter: null,

	currEncounterStartDate: null,
	initComponent: function(){
		var me = this;

		me.renderAdministrative = acl['access_enc_hcfa'] || acl['access_enc_cpt'] || acl['access_enc_history'];

		me.timerTask = {
			scope: me,
			run: function(){
				me.encounterTimer();
			},
			interval: 1000 //1 second
		};

		/**
		 * stores
		 * @type {*}
		 */
		me.encounterStore = Ext.create('App.store.patient.Encounters', {
			listeners: {
				scope: me,
				datachanged: me.getProgressNote
			}
		});

		me.encounterEventHistoryStore = Ext.create('App.store.administration.AuditLog');


		if(me.renderAdministrative){
			me.centerPanel = Ext.create('Ext.tab.Panel', {
				region: 'center',
				margin: '1 0 0 0',
				activeTab: 0,
				bodyPadding: 5,
				listeners: {
					render: function(){
						this.items.each(function(i){
							i.tab.on('click', function(){
								me.onTapPanelChange(this);
							});
						});
					}
				}
			});
		}else{
			me.centerPanel = Ext.create('Ext.panel.Panel', {
				region: 'center',
				margin: '1 0 0 0',
				layout: 'fit',
				bodyPadding: 5
			});
		}

		/**
		 * Encounter Tab Panel and its Panels...
		 * @type {*}
		 */
		me.encounterTabPanel = me.centerPanel.add(
			Ext.create('Ext.tab.Panel', {
				title: me.renderAdministrative ? i18n('encounter') : false,
				itemId: 'encounter',
				plain: true,
				activeItem: 0,
				border: false,
				action: 'encounterTabPanel',
				defaults: {
					bodyStyle: 'padding:15px',
					bodyBorder: true,
					layout: 'fit'
				}
			})
		);

		if(me.enableClicnicaDecisionSupport && a('access_clinical_decision_support')){
			me.encounterTabPanel.addDocked({
				xtype: 'decisionsupportwarningpanel',
				itemId: 'DecisionSupportWarningPanel',
				dock: 'top'
			});
		}

		if(me.enableVitals && acl['access_patient_vitals']){
			me.vitalsPanel = me.encounterTabPanel.add(
				Ext.create('App.view.patient.Vitals')
			);
		}

		if(me.enableReviewOfSystem && acl['access_review_of_systems']){
			me.reviewSysPanel = me.encounterTabPanel.add(
				Ext.create('Ext.form.Panel', {
					autoScroll: true,
					action: 'encounter',
					title: i18n('review_of_systems'),
					frame: true,
					bodyPadding: 5,
					bodyStyle: 'background-color:white',
					fieldDefaults: {
						msgTarget: 'side'
					},
					plugins: {
						ptype: 'advanceform',
						autoSync: g('autosave'),
						syncAcl: acl['edit_encounters']
					},
					buttons: [
						{
							text: i18n('save'),
							iconCls: 'save',
							action: 'reviewOfSystems',
							scope: me,
							itemId: 'encounterRecordAdd',
							handler: me.onEncounterUpdate
						}
					]
				})
			);
		}

		if(me.enableReviewOfSystemChecks && acl['access_review_of_systems_checks']){
			me.reviewSysCkPanel = me.encounterTabPanel.add(
				Ext.create('Ext.form.Panel', {
					autoScroll: true,
					action: 'encounter',
					title: i18n('review_of_systems_checks'),
					frame: true,
					bodyPadding: 5,
					bodyStyle: 'background-color:white',
					fieldDefaults: {
						msgTarget: 'side'
					},
					plugins: {
						ptype: 'advanceform',
						autoSync: g('autosave'),
						syncAcl: acl['edit_encounters']
					},
					buttons: [
						{
							text: i18n('save'),
							iconCls: 'save',
							action: 'reviewOfSystemsChecks',
							scope: me,
							itemId: 'encounterRecordAdd',
							handler: me.onEncounterUpdate
						}
					]
				})
			);
		}

		if(me.enableFamilyHistory && acl['access_family_history']){
			me.familyHistoryPanel = me.encounterTabPanel.add(
				Ext.create('App.view.patient.encounter.FamilyHistory')
			);
		}

		if(me.enableItemsToReview && acl['access_itmes_to_review']){
			me.itemsToReview = me.encounterTabPanel.add(
				Ext.create('App.view.patient.ItemsToReview', {
					title: i18n('items_to_review'),
					bodyPadding: '7 5 2 5'
				})
			);
		}

		if(me.enableSOAP && acl['access_soap']){
			me.soapPanel = me.encounterTabPanel.add(
				Ext.create('App.view.patient.encounter.SOAP', {
					bodyStyle: 'padding:0',
					enc: me
				})
			);
		}

		/**
		 * Administravive Tab Panel and its Panels
		 * @type {*}
		 */
		if((me.enableHCFA && acl['access_enc_hcfa']) ||
			(me.enableCPT && acl['access_enc_cpt']) ||
			(me.enableEncHistory && acl['access_enc_history'])){
			me.administrativeTabPanel = me.centerPanel.add(
				Ext.create('Ext.tab.Panel', {
					title: i18n('administrative'),
					itemId: 'administrative',
					plain: true,
					activeItem: 0,
					defaults: {
						bodyStyle: 'padding:15px',
						bodyBorder: true,
						layout: 'fit'
					}
				})
			);
		}

		if(me.enableHCFA && acl['access_enc_hcfa']){
			me.MiscBillingOptionsPanel = me.administrativeTabPanel.add(
				Ext.create('App.view.patient.encounter.HealthCareFinancingAdministrationOptions', {
					autoScroll: true,
					title: i18n('misc_billing_options_HCFA_1500'),
					frame: true,
					bodyPadding: 5,
					bodyStyle: 'background-color:white',
					fieldDefaults: {
						msgTarget: 'side'
					},
					plugins: {
						ptype: 'advanceform',
						autoSync: g('autosave'),
						syncAcl: acl['edit_enc_hcfa']
					},
					buttons: [
						{
							text: i18n('save'),
							iconCls: 'save',
							action: 'soap',
							scope: me,
							handler: me.onEncounterUpdate
						}
					]
				})
			);
		}

		if(me.enableCPT && acl['access_enc_cpt']){
			me.CurrentProceduralTerminology = me.administrativeTabPanel.add(
				Ext.create('App.view.patient.encounter.CurrentProceduralTerminology', {
					title: i18n('current_procedural_terminology')
				})
			);
		}

		if(me.enableEncHistory && acl['access_enc_history']){
			me.EncounterEventHistory = me.administrativeTabPanel.add(
				Ext.create('App.ux.grid.EventHistory', {
					bodyStyle: 0,
					title: i18n('encounter_history'),
					store: me.encounterEventHistoryStore
				})
			);
		}


		/**
		 * Progress Note
		 */
		me.rightPanel = Ext.create('Ext.tab.Panel', {
			title: i18n('encounter_progress_note'),
			width: 500,
			region: 'east',
			split: true,
			collapsible: true,
			animCollapse: true,
			collapsed: true,
			itemId: 'EncounterProgressNotesPanel',
			listeners: {
				scope: this,
				collapse: me.progressNoteCollapseExpand,
				expand: me.progressNoteCollapseExpand
			},

			items: [
				me.progressNote = Ext.create('App.view.patient.ProgressNote', {
					title: i18n('progress_note'),
					autoScroll: true,
					tbar: [
						'->', {
							xtype: 'tool',
							type: 'print',
							tooltip: i18n('print_progress_note'),
							scope: me,
							handler: function(){
								var win = window.open('print.html', 'win', 'left=20,top=20,width=700,height=700,toolbar=0,resizable=1,location=1,scrollbars=1,menubar=0,directories=0');
								var dom = me.progressNote.body.dom;
								var wrap = document.createElement('div');
								var html = wrap.appendChild(dom.cloneNode(true));
								win.document.write(html.innerHTML);
								Ext.defer(function(){
									win.print();
								}, 1000);
							}
						}
					]
				}),

				me.progressHistory = Ext.create('Ext.panel.Panel', {
					title: i18n('progress_history'),
					bodyPadding: 5,
					autoScroll: true,
					items: [
						{}
					]
				})
			]

		});

		me.panelToolBar = Ext.create('Ext.toolbar.Toolbar', {
			dock: 'top',
//			ui:'footer',
			defaults: {
				scope: me,
				handler: me.onMedicalWin
			},
			items: ['-', {
				text: i18n('immunizations') + ' ',
				action: 'immunization'
			}, '-', {
				text: i18n('allergies') + ' ',
				action: 'allergies'
			}, '-', {
				text: i18n('active_problems') + ' ',
				action: 'activeproblems'
			}, '-', {
				text: i18n('medications') + ' ',
				action: 'medications'
			}, '-', {
				text: i18n('results') + ' ',
				action: 'laboratories'
			}, '-', {
				text: i18n('social_history') + ' ',
				action: 'socialhistory'
			}, '-', {
				text: i18n('functional_status') + ' ',
				action: 'functionalstatus'
			}, '-', {
				text: i18n('referrals') + ' ',
				action: 'referrals'
			}, '-', {
				text: i18n('lab_orders'),
				action: 'lab',
				scope: me,
				handler: me.newDoc
			}, '-', {
				text: i18n('xray_ct_orders'),
				action: 'xRay',
				scope: me,
				handler: me.newDoc
			}, '-', {
				text: i18n('rx_orders'),
				action: 'prescription',
				scope: me,
				handler: me.newDoc
			}, '-', {
				text: i18n('new_doctors_note'),
				action: 'notes',
				scope: me,
				handler: me.newDoc
			}, '-', '->', '-', me.priorityCombo = Ext.create('App.ux.combo.EncounterPriority', {
				listeners: {
					scope: me,
					select: me.prioritySelect
				}
			}), '-'
			]
		});

		if(acl['access_encounter_checkout']){
			me.panelToolBar.add({
				text: i18n('sign'),
				icon: 'resources/images/icons/edit.png',
				handler: me.onSignEncounter
			}, '-');
		}

		me.pageBody = [me.centerPanel, me.rightPanel];

		me.listeners = {
			beforerender: me.beforePanelRender
		};

		me.callParent();
		me.down('panel').addDocked(me.panelToolBar);

	},

	newDoc: function(btn){
		app.onNewDocumentsWin(btn.action)
	},

	/**
	 * opens the Medical window
	 * @param btn
	 */
	onMedicalWin: function(btn){
		app.onMedicalWin(btn.action);
	},

	/**
	 * opens the Chart window
	 */
	onChartWindowShow: function(){
		app.onChartsWin();
	},

	prioritySelect: function(cmb, records){
		this.changeEncounterPriority(records[0].data.option_value);
	},

	changeEncounterPriority: function(priority){
		var me = this, params = {
			pid: me.pid,
			eid: me.eid,
			priority: priority
		};
		Encounter.updateEncounterPriority(params, function(){
			app.patientButtonRemoveCls();
			app.patientBtn.addCls(priority);
		});
		me.getProgressNote();
	},

	/**
	 * Sends the data to the server to be saved.
	 * This function needs the button action to determine
	 * which form  to save.
	 * @param SaveBtn
	 */
	onEncounterUpdate: function(SaveBtn){
		var me = this,
			form;
		if(SaveBtn.action == "encounter"){
			form = me.newEncounterWindow.down('form').getForm();
		}else{
			form = SaveBtn.up('form').getForm();
		}
		if(form.isValid()){
			var values = form.getValues(),
				store,
				record,
				storeIndex;

			if(SaveBtn.action == 'encounter'){
				if(acl['add_encounters']){
					record = form.getRecord();
					record.set(values);
					record.save({
						callback: function(record){
							var data = record.data;
							app.patientButtonRemoveCls();
							app.patientBtn.addCls(data.priority);
							me.openEncounter(data.eid);
							SaveBtn.up('window').hide();
							/** GAIAEH-177 GAIAEH-173 170.302.r Audit Log (core) **/
							app.AuditLog('Patient encounter created');
						}
					});
				}else{
					SaveBtn.up('window').close();
					app.accessDenied();
				}
			}else if(SaveBtn.action == 'vitals'){
				var VFields = form.getFields().items,
					VFieldsCount = VFields.length,
					emptyCount = 0;

				for(var i = 0; i < VFields.length; i++){
					if(VFields[i].xtype != 'mitos.datetime'){
						if(VFields[i].value == ''){
							emptyCount++;
						}
					}
				}

				if((VFieldsCount - 3) > emptyCount){
					if(acl['add_vitals']){

						say(me);

						store = me.encounter.vitals();
						record = form.getRecord();
						values = me.addDefaultData(values);
						storeIndex = store.indexOf(record);
						if(storeIndex == -1){
							store.insert(0, values);
						}else{
							record.set(values);
						}
						store.sync({
							scope: me,
							success: function(){
								me.msg('Sweet!', i18n('vitals_saved'));
								me.getProgressNote();
								me.vitalsPanel.down('vitalsdataview').refresh();
								me.resetVitalsForm();
							}
						});
					}else{
						app.accessDenied();
					}
				}else{
					me.msg('Oops!', i18n('vitals_form_is_epmty'), true)
				}
			}else{
				if(acl['edit_encounters']){
					record = form.getRecord();
					store = record.store;
					values = me.addDefaultData(values);
					record.set(values);
					store.sync({
						callback: function(){
							me.msg('Sweet!', i18n('encounter_updated'));
							/** GAIAEH-177 GAIAEH-173 170.302.r Audit Log (core) **/
							app.AuditLog('Patient encounter updated');
						}
					});
					me.encounterEventHistoryStore.load({
						filters: [
							{
								property: 'eid',
								value: me.eid
							}
						]
					});
				}else{
					app.accessDenied();
				}
			}
		}
	},

	onVitalsSign: function(){
		var me = this,
			form = me.vitalsPanel.down('form').getForm(),
			store = me.encounter.vitals(),
			record = form.getRecord();

		if(form.isValid()){
			me.passwordVerificationWin(function(btn, password){
				if(btn == 'ok'){
					User.verifyUserPass(password, function(provider, response){
						if(response.result){
							record.set({
								auth_uid: user.id
							});
							store.sync({
								callback: function(){
									form.reset();
									me.msg('Sweet!', i18n('vitals_signed'));
									me.getProgressNote();
									me.resetVitalsForm();
									me.vitalsPanel.down('vitalsdataview').refresh();
									/** GAIAEH-177 GAIAEH-173 170.302.r Audit Log (core) **/
									app.AuditLog('Patient vitals signed');
								}
							});
						}else{
							Ext.Msg.show({
								title: 'Oops!',
								msg: i18n('incorrect_password'),
								buttons: Ext.Msg.OKCANCEL,
								icon: Ext.Msg.ERROR,
								fn: function(btn){
									if(btn == 'ok'){
										me.onVitalsSign();
									}
								}
							});
						}
					});
				}
			});
		}
	},

	/**
	 * Takes the form data to be send and adds the default
	 * data used by every encounter form. For example
	 * pid (Patient ID), eid (Encounter ID), uid (User ID),
	 * and date (Current datetime as 00-00-00 00:00:00)
	 * @param data
	 */
	addDefaultData: function(data){
		data.pid = this.pid;
		data.eid = this.eid;
		data.uid = user.id;
		data.date = Ext.Date.format(new Date(), 'Y-m-d H:i:s');
		return data;
	},

	/**
	 *
	 * @param eid
	 */
	openEncounter: function(eid){
		var me = this,
			vitals,
			record,
			store;

		me.el.mask(i18n('loading...') + ' ' + i18n('encounter') + ' - ' + eid);
		me.resetTabs();

		/** GAIAEH-177 GAIAEH-173 170.302.r Audit Log (core) **/
		app.AuditLog('Patient encounter viewed');

		if(me.encounter) delete me.encounter;

		App.model.patient.Encounter.load(eid, {
			scope: me,
			callback: function(record){
				me.encounter = record;
				var data = me.encounter.data;

				// set pid globally for convenient use
				me.pid = data.pid;
				me.eid = data.eid;

				me.currEncounterStartDate = data.service_date;

				app.fireEvent('beforeencounterload', me.encounter);

				/** get progress note **/
				me.getProgressNote();

				if(!data.close_date){
					me.startTimer();
					me.setButtonsDisabled(me.getButtonsToDisable());
				}else{
					if(me.stopTimer()){
						var timer = me.timer(data.service_date, data.close_date), patient = app.patient;
						me.updateTitle(patient.name + ' #' + patient.pid + ' - ' + patient.age.str + ' - ' + Ext.Date.format(me.currEncounterStartDate, 'F j, Y, g:i:s a') + ' (' + i18n('closed_encounter') + ')', app.patient.readOnly, timer);
						me.setButtonsDisabled(me.getButtonsToDisable(), true);
					}
				}


				if(me.reviewSysPanel){
					store = me.encounter.reviewofsystems();
					store.on('write', me.getProgressNote, me);
					me.reviewSysPanel.getForm().loadRecord(store.getAt(0));
				}

				if(me.familyHistoryPanel){
					store = me.encounter.familyhistory();
					store.on('write', me.getProgressNote, me);
					if(!store.last()){
						store.add({
							pid: data.pid,
							eid: data.eid,
							create_uid: app.user.id,
							create_date: new Date()
						});
					}
					me.familyHistoryPanel.getForm().loadRecord(store.last());
				}

				if(me.reviewSysCkPanel){
					store = me.encounter.reviewofsystemschecks();
					store.on('write', me.getProgressNote, me);
					me.reviewSysCkPanel.getForm().loadRecord(store.getAt(0));
				}

				if(me.soapPanel){
					store = me.encounter.soap();
					store.on('write', me.getProgressNote, me);
					me.soapPanel.down('form').getForm().loadRecord(store.getAt(0));
				}

				if(me.MiscBillingOptionsPanel){
					store = me.encounter.hcfaoptions();
					me.MiscBillingOptionsPanel.getForm().loadRecord(store.getAt(0));
				}

				me.priorityCombo.setValue(data.priority);

				me.encounterEventHistoryStore.load({
					filters: [
						{
							property: 'eid', value: me.eid
						}
					]
				});

				if(me.CurrentProceduralTerminology){
					me.CurrentProceduralTerminology.encounterCptStoreLoad(me.pid, me.eid, function(){
						me.CurrentProceduralTerminology.setDefaultQRCptCodes();
					});
				}

				if(me.progressHistory) me.getProgressNotesHistory();

				//if(app.PreventiveCareWindow) app.PreventiveCareWindow.loadPatientPreventiveCare();

				app.setEncounterClose(record.isClose());

				app.fireEvent('encounterload', me.encounter);
				me.el.unmask();

			}
		});

	},

	/**
	 * Function to close the encounter..
	 */
	doSignEncounter: function(isSupervisor, callback){
		var me = this,
			form,
			values;

		me.passwordVerificationWin(function(btn, password){
			if(btn == 'ok'){

				form = app.checkoutWindow.down('form').getForm();
				values = form.getValues();
				values.eid = me.eid;
				values.signature = password;
				values.isSupervisor = isSupervisor;

				if(acl['require_enc_supervisor'] || isSupervisor){
					values.requires_supervisor = true;
					values.supervisor_uid = app.checkoutWindow.coSignCombo.getValue();
				}else if(!isSupervisor && !acl['require_enc_supervisor']){
					values.requires_supervisor = false;
				}

				Encounter.signEncounter(values, function(provider, response){
					if(response.result.success){
						if(me.stopTimer()){

							/** default data for notes and reminder **/
							var params = {
								pid: me.pid,
								eid: me.eid,
								uid: app.user.id,
								type: 'checkout',
								date: new Date()
							};

							/** create a new note if not blank **/
							params.body = values.note;
							if(params.body !== '') Ext.create('App.model.patient.Notes', params).save();
							/** create a new reminder if not blank **/
							params.body = values.reminder;
							if(params.body !== '') Ext.create('App.model.patient.Reminders', params).save();

							/** unset the patient eid **/
							app.patient.eid = null;
							app.openPatientVisits();

							app.AuditLog('Patient encounter ' + (isSupervisor ? 'co-signed' : 'signed'));
							me.msg('Sweet!', i18n('encounter_closed'));
							app.checkoutWindow.close();
						}
					}else{
						Ext.Msg.show({
							title: 'Oops!',
							msg: i18n(response.result.error),
							buttons: Ext.Msg.OK,
							icon: Ext.Msg.ERROR
						});
					}
				});
			}
		});
	},

	/**
	 * CheckOut Functions
	 */
	onSignEncounter: function(){
		var title = app.patient.name + ' #' + app.patient.pid + ' - ' + Ext.Date.format(this.currEncounterStartDate, 'F j, Y, g:i:s a') + ' (' + i18n('checkout') + ')';
		app.checkoutWindow.enc = this;
		app.checkoutWindow.setTitle(title);
		app.checkoutWindow.show();
	},

	isClose:function(){
		return typeof this.encounter.data.close_date != 'undefined' && this.encounter.data.close_date != null;
	},

	isSigned:function(){
		return typeof this.encounter.data.provider_uid != 'undefined' && this.encounter.data.provider_uid != null && this.encounter.data.provider_uid != 0;
	},


	/**
	 * listen for the progress note panel and runs the
	 * doLayout function to re-adjust the dimensions.
	 */
	progressNoteCollapseExpand: function(){
		this.centerPanel.doLayout();
	},

	getProgressNote: function(){
		var me = this;
		Encounter.getProgressNoteByEid(me.eid, function(provider, response){
			me.progressNote.tpl.overwrite(me.progressNote.body, response.result);
		});
	},

	getProgressNotesHistory: function(){
		var me = this,
			soaps;

		say(me);

		me.progressHistory.removeAll();
		Encounter.getSoapHistory({pid: me.encounter.data.pid, eid: me.encounter.data.eid}, function(provider, response){
			soaps = response.result;
			for(var i = 0; i < soaps.length; i++){
				me.progressHistory.add(Ext.create('Ext.form.FieldSet', {
					styleHtmlContent: true,
					title: '<span style="font-weight: bold; font-size: 14px;">' + soaps[i].service_date + '</span>',
					html: '<strong>' + i18n('subjective') + ':</strong> ' + (soaps[i].subjective ? soaps[i].subjective : 'none') + '<br>' + '<strong>' + i18n('objective') + ':</strong> ' + (soaps[i].objective ? soaps[i].objective : 'none') + '<br>' + '<strong>' + i18n('assessment') + ':</strong> ' + (soaps[i].assessment ? soaps[i].assessment : 'none') + '<br>' + '<strong>' + i18n('plan') + ':</strong> ' + (soaps[i].plan ? soaps[i].plan : 'none')
				}))
			}
		})
	},

	onTapPanelChange: function(panel){
		if(panel.card.itemId == 'encounter'){
			this.setEncounterProgressCollapsed(false);
		}else{
			this.setEncounterProgressCollapsed(true);
		}
	},

	setEncounterProgressCollapsed: function(ans){
		ans ? this.rightPanel.collapse() : this.rightPanel.expand();
	},

	//***************************************************************************************************//
	//***************************************************************************************************//
	//*********    *****  ******    ****** **************************************************************//
	//*********  *  ****  ****  ***  ***** **************************************************************//
	//*********  **  ***  ***  *****  **** **************************************************************//
	//*********  ***  **  ***  *****  **** **************************************************************//
	//*********  ****  *  ****  ***  ********************************************************************//
	//*********  *****    *****    ******* **************************************************************//
	//***************************************************************************************************//
	//***************************************************************************************************//

	/**
	 * Start the timerTask
	 */
	startTimer: function(){
		Ext.TaskManager.start(this.timerTask);
		return true;
	},

	/**
	 * stops the timerTask
	 */
	stopTimer: function(){
		Ext.TaskManager.stop(this.timerTask);
		return true;
	},

	/**
	 * This will update the timer every sec
	 */
	encounterTimer: function(){
		var me = this, timer = me.timer(me.currEncounterStartDate, new Date());
		if(app.patient.pid != null){
			me.updateTitle(app.patient.name + ' #' + app.patient.pid + ' - ' + app.patient.age.str + ' - ' + Ext.Date.format(me.currEncounterStartDate, 'F j, Y, g:i:s a') + ' (' + i18n('open_encounter') + ')', app.patient.readOnly, timer);
		}else{
			me.stopTimer();
		}
	},

	/**
	 * This function use the "start time" and "stop time"
	 * and gets the time elapsed between the two then
	 * returns it as a timer (00:00:00)  or (1 day(s) 00:00:00)
	 * if more than 24 hrs
	 *
	 * @param start
	 * @param stop
	 */
	timer: function(start, stop){
		var ms = Ext.Date.getElapsed(start, stop), t, sec = Math.floor(ms / 1000);

		function twoDigit(d){
			return (d >= 10) ? d : '0' + d;
		}

		var min = Math.floor(sec / 60);
		sec = sec % 60;
		t = twoDigit(sec);
		var hr = Math.floor(min / 60);
		min = min % 60;
		t = twoDigit(min) + ":" + t;
		var day = Math.floor(hr / 24);
		hr = hr % 24;
		t = twoDigit(hr) + ":" + t;
		t = (day == 0 ) ? '<span class="time">' + t + '</span>' : '<span class="day">' + day + ' ' + i18n('day_s') + '</span><span class="time">' + t + '</span>';
		return t;
	},


	/**
	 * After this panel is render add the forms and listeners for conventions
	 */
	beforePanelRender: function(){
		var me = this, form,
			defaultFields = function(){
				return [
					{
						name: 'id',
						type: 'int'
					},
					{
						name: 'pid',
						type: 'int'
					},
					{
						name: 'eid',
						type: 'int'
					},
					{
						name: 'uid',
						type: 'int'
					}
				]
			};

		/**
		 * Get 'Review of Systems' Form and define the Model using the form fields
		 */
		if(me.reviewSysPanel){
			me.getFormItems(me.reviewSysPanel, 8, function(){

			});
		}

		/**
		 * Get 'Review of Systems Check' Form and define the Model using the form fields
		 */
		if(me.reviewSysCkPanel){
			me.getFormItems(me.reviewSysCkPanel, 9, function(){
				var formFields = me.reviewSysCkPanel.getForm().getFields(), modelFields = new defaultFields;
				for(var i = 0; i < formFields.items.length; i++){
					modelFields.push({
						name: formFields.items[i].name,
						type: 'auto'
					});
				}
				Ext.define('App.model.patient.ReviewOfSystemsCheck', {
					extend: 'Ext.data.Model',
					fields: modelFields,
					proxy: {
						type: 'direct',
						api: {
							update: 'Encounter.updateReviewOfSystemsChecks'
						}
					},
					belongsTo: {
						model: 'App.model.patient.Encounter',
						foreignKey: 'eid'
					}
				});
			});
		}
	},

	getButtonsToDisable: function(){
		var me = this, buttons = [];
		if(me.ButtonsToDisable == null){
			if(me.vitalsPanel) buttons.concat(buttons, me.vitalsPanel.query('button'));
			if(me.reviewSysPanel) buttons.concat(buttons, me.reviewSysPanel.query('button'));
			if(me.reviewSysCkPanel) buttons.concat(buttons, me.reviewSysCkPanel.query('button'));
			if(me.soapPanel) buttons.concat(buttons, me.soapPanel.down('form').query('button'));
			if(me.MiscBillingOptionsPanel) buttons.concat(buttons, me.MiscBillingOptionsPanel.query('button'));
			if(me.CurrentProceduralTerminology) buttons.concat(buttons, me.CurrentProceduralTerminology.query('button'));
			if(me.EncounterEventHistory) buttons.concat(buttons, me.EncounterEventHistory.query('button'));
			if(me.newEncounterWindow) buttons.concat(buttons, me.newEncounterWindow.query('button'));
			if(app.checkoutWindow) buttons.concat(buttons, app.checkoutWindow.query('button'));
			me.ButtonsToDisable = buttons;
		}
		return me.ButtonsToDisable;
	},

	resetTabs: function(){
		var me = this;
		if(me.renderAdministrative) me.centerPanel.setActiveTab(0);
		if(me.encounterTabPanel) me.encounterTabPanel.setActiveTab(0);
		if(me.administrativeTabPanel) me.administrativeTabPanel.setActiveTab(0);
		if(me.rightPanel) me.rightPanel.setActiveTab(0);
	},

	onDocumentView: function(grid, rowIndex){
		var rec = grid.getStore().getAt(rowIndex), src = rec.data.url;
		app.onDocumentView(src);
	},

	/**
	 * This function is called from Viewport.js when
	 * this panel is selected in the navigation panel.
	 * place inside this function all the functions you want
	 * to call every this panel becomes active
	 */
	onActive: function(callback){
		var me = this,
			patient = app.patient;

		if(patient.pid && patient.eid){

			me.updateTitle(patient.name + ' (' + i18n('visits') + ')', patient.readOnly, null);
			me.setReadOnly(patient.readOnly);
			callback(true);
		}else{
			callback(false);
			var msg = patient.eid === null ? 'Please create a new encounter or select one from the patient encounter history' : null;
			me.currPatientError(msg);
		}
	}
});
