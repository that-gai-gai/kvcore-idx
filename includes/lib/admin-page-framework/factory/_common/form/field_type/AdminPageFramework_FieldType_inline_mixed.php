<?php 
/**
	Admin Page Framework v3.8.15 by Michael Uno 
	Generated by PHP Class Files Script Generator <https://github.com/michaeluno/PHP-Class-Files-Script-Generator>
	<http://en.michaeluno.jp/kvcore>
	Copyright (c) 2013-2017, Michael Uno; Licensed under MIT <http://opensource.org/licenses/MIT> */
class kvCORE_AdminPageFramework_FieldType__nested extends kvCORE_AdminPageFramework_FieldType {
    public $aFieldTypeSlugs = array('_nested');
    protected $aDefaultKeys = array();
    protected function getStyles() {
        return ".kvcore-fieldset > .kvcore-fields > .kvcore-field.with-nested-fields > .kvcore-fieldset.multiple-nesting {margin-left: 2em;}.kvcore-fieldset > .kvcore-fields > .kvcore-field.with-nested-fields > .kvcore-fieldset {margin-bottom: 1em;}.with-nested-fields > .kvcore-fieldset.child-fieldset > .kvcore-child-field-title {display: inline-block;padding: 0 0 0.4em 0;}.kvcore-fieldset.child-fieldset > label.kvcore-child-field-title {display: table-row; white-space: nowrap;}";
    }
    protected function getField($aField) {
        $_oCallerForm = $aField['_caller_object'];
        $_aInlineMixedOutput = array();
        foreach ($this->getAsArray($aField['content']) as $_aChildFieldset) {
            if (is_scalar($_aChildFieldset)) {
                continue;
            }
            if (!$this->isNormalPlacement($_aChildFieldset)) {
                continue;
            }
            $_aChildFieldset = $this->getFieldsetReformattedBySubFieldIndex($_aChildFieldset, ( integer )$aField['_index'], $aField['_is_multiple_fields'], $aField);
            $_oFieldset = new kvCORE_AdminPageFramework_Form_View___Fieldset($_aChildFieldset, $_oCallerForm->aSavedData, $_oCallerForm->getFieldErrors(), $_oCallerForm->aFieldTypeDefinitions, $_oCallerForm->oMsg, $_oCallerForm->aCallbacks);
            $_aInlineMixedOutput[] = $_oFieldset->get();
        }
        return implode('', $_aInlineMixedOutput);
    }
}
class kvCORE_AdminPageFramework_FieldType_inline_mixed extends kvCORE_AdminPageFramework_FieldType__nested {
    public $aFieldTypeSlugs = array('inline_mixed');
    protected $aDefaultKeys = array('label_min_width' => '', 'show_debug_info' => false,);
    protected function getStyles() {
        return ".kvcore-field-inline_mixed {width: 98%;}.kvcore-field-inline_mixed > fieldset {display: inline-block;overflow-x: visible;padding-right: 0.4em;}.kvcore-field-inline_mixed > fieldset > .kvcore-fields{display: inline;width: auto;table-layout: auto;margin: 0;padding: 0;vertical-align: middle;white-space: nowrap;}.kvcore-field-inline_mixed > fieldset > .kvcore-fields > .kvcore-field {float: none;clear: none;width: 100%;display: inline-block;margin-right: auto;vertical-align: middle; }.with-mixed-fields > fieldset > label {width: auto;padding: 0;}.kvcore-field-inline_mixed > fieldset > .kvcore-fields > .kvcore-field .kvcore-input-label-string {padding: 0;}.kvcore-field-inline_mixed > fieldset > .kvcore-fields > .kvcore-field > .kvcore-input-label-container,.kvcore-field-inline_mixed > fieldset > .kvcore-fields > .kvcore-field > * > .kvcore-input-label-container{padding: 0;display: inline-block;width: 100%;}.kvcore-field-inline_mixed > fieldset > .kvcore-fields > .kvcore-field > .kvcore-input-label-container > label,.kvcore-field-inline_mixed > fieldset > .kvcore-fields > .kvcore-field > * > .kvcore-input-label-container > label{display: inline-block;}.kvcore-field-inline_mixed > fieldset > .kvcore-fields > .kvcore-field > .kvcore-input-label-container > label > input,.kvcore-field-inline_mixed > fieldset > .kvcore-fields > .kvcore-field > * > .kvcore-input-label-container > label > input{display: inline-block;min-width: 100%;margin-right: auto;margin-left: auto;}.kvcore-field-inline_mixed .kvcore-input-label-container,.kvcore-field-inline_mixed .kvcore-input-label-string{min-width: 0;}";
    }
}